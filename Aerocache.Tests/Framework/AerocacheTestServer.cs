using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Aerocache.API.Controllers;
using Aerocache.API.Middleware;
using Aerocache.Business;
using Aerocache.Business.Interfaces;
using Aerocache.DataAccess.Context;
using Aerocache.DataAccess.Entities;
using Aerocache.DataManagement;

namespace Aerocache.Tests.Framework
{
    public sealed class InMemoryEventBus : IEventBus
    {
        public List<(string RoutingKey, string PayloadJson)> Events { get; } = new();

        public Task PublishAsync<T>(string routingKey, T message, CancellationToken cancellationToken = default)
        {
            Events.Add((routingKey, JsonSerializer.Serialize(message)));
            return Task.CompletedTask;
        }
    }

    /// <summary>
    /// Implementación en memoria de IServer + HttpMessageHandler para ejecutar todo el pipeline
    /// HTTP de ASP.NET Core (Middlewares, Routing, ModelBinding, Controllers, JSON Formatters)
    /// directamente en memoria sin abrir sockets TCP de red.
    /// </summary>
    internal sealed class InMemoryAspNetServer : IServer
    {
        private Func<IFeatureCollection, Task>? _processRequestAsync;

        public IFeatureCollection Features { get; } = new FeatureCollection();

        public InMemoryAspNetServer()
        {
            var addresses = new ServerAddressesFeature();
            addresses.Addresses.Add("http://localhost");
            Features.Set<IServerAddressesFeature>(addresses);
        }

        public Task StartAsync<TContext>(IHttpApplication<TContext> application, CancellationToken cancellationToken) where TContext : notnull
        {
            _processRequestAsync = async features =>
            {
                var ctx = application.CreateContext(features);
                try
                {
                    await application.ProcessRequestAsync(ctx);
                    application.DisposeContext(ctx, null);
                }
                catch (Exception ex)
                {
                    application.DisposeContext(ctx, ex);
                    throw;
                }
            };
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

        public void Dispose() { }

        public HttpMessageHandler CreateHandler() => new Handler(this);

        private sealed class Handler : HttpMessageHandler
        {
            private readonly InMemoryAspNetServer _server;
            public Handler(InMemoryAspNetServer server) => _server = server;

            protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            {
                if (_server._processRequestAsync == null)
                    throw new InvalidOperationException("InMemoryAspNetServer has not been started.");

                var httpContext = new DefaultHttpContext();
                var uri = request.RequestUri ?? new Uri("http://localhost/");

                httpContext.Request.Method = request.Method.Method;
                httpContext.Request.Scheme = uri.Scheme;
                httpContext.Request.Host = new HostString(uri.Host, uri.Port);
                httpContext.Request.Path = PathString.FromUriComponent(uri);
                httpContext.Request.QueryString = QueryString.FromUriComponent(uri);

                foreach (var header in request.Headers)
                {
                    httpContext.Request.Headers[header.Key] = header.Value.ToArray();
                }

                if (request.Content != null)
                {
                    foreach (var header in request.Content.Headers)
                    {
                        httpContext.Request.Headers[header.Key] = header.Value.ToArray();
                    }

                    var reqBytes = await request.Content.ReadAsByteArrayAsync(cancellationToken);
                    httpContext.Request.Body = new MemoryStream(reqBytes);
                    httpContext.Request.ContentLength = reqBytes.Length;
                }

                var responseBodyStream = new MemoryStream();
                httpContext.Response.Body = responseBodyStream;

                await _server._processRequestAsync(httpContext.Features);

                responseBodyStream.Position = 0;
                var respBytes = responseBodyStream.ToArray();

                var responseMessage = new HttpResponseMessage((HttpStatusCode)httpContext.Response.StatusCode)
                {
                    Content = new ByteArrayContent(respBytes)
                };

                foreach (var header in httpContext.Response.Headers)
                {
                    if (!responseMessage.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        responseMessage.Content.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                if (!string.IsNullOrEmpty(httpContext.Response.ContentType))
                {
                    responseMessage.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(httpContext.Response.ContentType);
                }

                return responseMessage;
            }
        }
    }

    public sealed class AerocacheTestServer : IAsyncDisposable
    {
        private readonly SqliteConnection _sqliteConnection;
        private readonly WebApplication _app;
        public HttpClient Client { get; }
        public InMemoryEventBus EventBus { get; }
        public IServiceProvider Services => _app.Services;

        private AerocacheTestServer(SqliteConnection sqliteConnection, WebApplication app, HttpClient client, InMemoryEventBus eventBus)
        {
            _sqliteConnection = sqliteConnection;
            _app = app;
            Client = client;
            EventBus = eventBus;
        }

        public static async Task<AerocacheTestServer> StartAsync(bool seedSampleFlightData = true)
        {
            var connection = new SqliteConnection("DataSource=:memory:");
            await connection.OpenAsync();

            var builder = WebApplication.CreateBuilder();
            builder.Logging.ClearProviders();

            var inMemoryServer = new InMemoryAspNetServer();
            builder.Services.AddSingleton<IServer>(inMemoryServer);

            builder.Services.AddControllers()
                .AddApplicationPart(typeof(BookingsController).Assembly)
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                    options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
                    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
                });

            builder.Services.AddDbContext<AerocacheDbContext>(opts => opts.UseSqlite(connection));
            builder.Services.AddDataManagement();
            builder.Services.AddBusiness();

            var serverInstanceEventBus = new InMemoryEventBus();
            var descriptor = builder.Services.FirstOrDefault(d => d.ServiceType == typeof(IEventBus));
            if (descriptor != null) builder.Services.Remove(descriptor);
            builder.Services.AddSingleton<IEventBus>(serverInstanceEventBus);

            var app = builder.Build();

            app.UseMiddleware<ProblemDetailsExceptionMiddleware>();
            app.UseRouting();
            app.MapControllers();

            await app.StartAsync();

            using (var scope = app.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AerocacheDbContext>();
                await db.Database.EnsureCreatedAsync();

                if (seedSampleFlightData)
                {
                    await SeedTestCatalogAsync(db);
                }
            }

            var httpClient = new HttpClient(inMemoryServer.CreateHandler())
            {
                BaseAddress = new Uri("http://localhost")
            };

            return new AerocacheTestServer(connection, app, httpClient, serverInstanceEventBus);
        }

        private static async Task SeedTestCatalogAsync(AerocacheDbContext db)
        {
            var targetDate = DateTime.UtcNow.Date.AddDays(5);
            var flight = new Vuelo
            {
                Id = "FL-AC1401-TEST",
                NumeroVuelo = "AC1401",
                AerolineaComercial = "AC",
                AerolineaOperadora = "AC",
                NombreAerolinea = "AEROCACHE",
                Aeronave = "Airbus A320",
                OrigenIata = "UIO",
                DestinoIata = "GYE",
                SalidaProgramada = targetDate.AddHours(8),
                LlegadaProgramada = targetDate.AddHours(8).AddMinutes(50),
                DuracionMinutos = 50,
                TerminalSalida = "T1",
                TerminalLlegada = "T1",
                Estado = "SCHEDULED",
                TarifasCabina = new List<TarifaCabina>
                {
                    new()
                    {
                        Id = "FARE-ECO-LIGHT",
                        VueloId = "FL-AC1401-TEST",
                        ClaseCabina = "ECONOMY",
                        MarcaTarifa = "Light",
                        AsientosDisponibles = 40,
                        TarifaBase = 49.00m,
                        Impuestos = 7.35m,
                        PrecioTotal = 56.35m,
                        Moneda = "USD",
                        EsReembolsable = false,
                        PermiteCambios = true
                    },
                    new()
                    {
                        Id = "FARE-ECO-PLUS",
                        VueloId = "FL-AC1401-TEST",
                        ClaseCabina = "ECONOMY",
                        MarcaTarifa = "Plus",
                        AsientosDisponibles = 30,
                        TarifaBase = 69.00m,
                        Impuestos = 10.35m,
                        PrecioTotal = 79.35m,
                        Moneda = "USD",
                        EsReembolsable = true,
                        PermiteCambios = true
                    }
                },
                Asientos = new List<Asiento>()
            };

            for (int row = 4; row <= 12; row++)
            {
                foreach (var col in new[] { "A", "B", "C", "D", "E", "F" })
                {
                    flight.Asientos.Add(new Asiento
                    {
                        Id = $"SEAT-{flight.Id}-{row}{col}",
                        VueloId = flight.Id,
                        SegmentoId = $"SEG-{flight.Id}",
                        ClaseCabina = "ECONOMY",
                        NumeroFila = row,
                        NumeroAsiento = $"{row}{col}",
                        EstaDisponible = true,
                        Caracteristicas = (col == "A" || col == "F") ? "WINDOW" : "AISLE"
                    });
                }
            }

            db.Vuelos.Add(flight);
            await db.SaveChangesAsync();
        }

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await _app.StopAsync();
            await _app.DisposeAsync();
            await _sqliteConnection.CloseAsync();
            await _sqliteConnection.DisposeAsync();
        }
    }
}

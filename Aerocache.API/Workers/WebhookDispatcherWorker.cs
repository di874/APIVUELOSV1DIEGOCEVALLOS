using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using Aerocache.DataManagement.Interfaces;

namespace Aerocache.API.Workers
{
    /// <summary>
    /// Microservicio MS.G.Webhooks:
    /// Consume eventos del bus RabbitMQ (booking.*, flight.*, postsale.*)
    /// y los despacha asíncronamente a los endpoints de webhooks registrados.
    /// </summary>
    public class WebhookDispatcherWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _config;
        private readonly ILogger<WebhookDispatcherWorker> _logger;
        private readonly HttpClient _httpClient;
        private readonly string _exchangeName;
        private readonly string _queueName = "aerocache.webhooks.queue";

        public WebhookDispatcherWorker(
            IServiceProvider serviceProvider,
            IConfiguration config,
            ILogger<WebhookDispatcherWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _config = config;
            _logger = logger;
            _exchangeName = _config["RabbitMQ:ExchangeName"] ?? "aerocache.events";
            _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🚀 [MS.G.Webhooks] Iniciando Worker despachador de eventos...");

            var host = _config["RabbitMQ:HostName"] ?? "localhost";
            var portStr = _config["RabbitMQ:Port"];
            int port = int.TryParse(portStr, out var p) ? p : 5672;
            var user = _config["RabbitMQ:UserName"] ?? "guest";
            var pass = _config["RabbitMQ:Password"] ?? "guest";

            var factory = new ConnectionFactory
            {
                HostName = host,
                Port = port,
                UserName = user,
                Password = pass,
                AutomaticRecoveryEnabled = true,
                NetworkRecoveryInterval = TimeSpan.FromSeconds(5)
            };

            while (!stoppingToken.IsCancellationRequested)
            {
                IConnection? connection = null;
                IChannel? channel = null;

                try
                {
                    connection = await factory.CreateConnectionAsync(stoppingToken);
                    channel = await connection.CreateChannelAsync(cancellationToken: stoppingToken);

                    await channel.ExchangeDeclareAsync(
                        exchange: _exchangeName,
                        type: ExchangeType.Topic,
                        durable: true,
                        autoDelete: false,
                        cancellationToken: stoppingToken
                    );

                    await channel.QueueDeclareAsync(
                        queue: _queueName,
                        durable: true,
                        exclusive: false,
                        autoDelete: false,
                        arguments: null,
                        cancellationToken: stoppingToken
                    );

                    // Suscribirse a tópicos del diagrama
                    await channel.QueueBindAsync(_queueName, _exchangeName, "booking.*", cancellationToken: stoppingToken);
                    await channel.QueueBindAsync(_queueName, _exchangeName, "flight.*", cancellationToken: stoppingToken);
                    await channel.QueueBindAsync(_queueName, _exchangeName, "postsale.*", cancellationToken: stoppingToken);

                    _logger.LogInformation("✓ [MS.G.Webhooks] Cola '{Queue}' vinculada a '{Exchange}' con patrones 'booking.*', 'flight.*', 'postsale.*'",
                        _queueName, _exchangeName);

                    var consumer = new AsyncEventingBasicConsumer(channel);
                    consumer.ReceivedAsync += async (model, ea) =>
                    {
                        var routingKey = ea.RoutingKey;
                        var bodyBytes = ea.Body.ToArray();
                        var payload = Encoding.UTF8.GetString(bodyBytes);

                        try
                        {
                            await DispatchWebhookPayloadAsync(routingKey, payload, stoppingToken);
                            await channel.BasicAckAsync(ea.DeliveryTag, multiple: false, cancellationToken: stoppingToken);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "[MS.G.Webhooks] Error procesando evento '{Key}'", routingKey);
                            await channel.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: false, cancellationToken: stoppingToken);
                        }
                    };

                    await channel.BasicConsumeAsync(
                        queue: _queueName,
                        autoAck: false,
                        consumer: consumer,
                        cancellationToken: stoppingToken
                    );

                    // Mantener el worker vivo mientras no haya cancelación
                    while (!stoppingToken.IsCancellationRequested && connection.IsOpen && channel.IsOpen)
                    {
                        await Task.Delay(2000, stoppingToken);
                    }
                }
                catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
                {
                    _logger.LogWarning("⚠️ [MS.G.Webhooks] RabbitMQ no disponible ({Msg}). Reintentando conexión en 8s...", ex.Message);
                    try
                    {
                        if (channel != null) await channel.CloseAsync(stoppingToken);
                        if (connection != null) await connection.CloseAsync(stoppingToken);
                    }
                    catch { }

                    await Task.Delay(8000, stoppingToken);
                }
            }
        }

        private async Task DispatchWebhookPayloadAsync(string routingKey, string payload, CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

            var subscriptions = await uow.SuscripcionesWebhooks.GetAllAsync();
            var matched = subscriptions.Where(s =>
            {
                try
                {
                    var events = JsonSerializer.Deserialize<List<string>>(s.EventosJson) ?? new();
                    return events.Contains("*") || events.Contains(routingKey) ||
                           events.Any(e => e.EndsWith(".*") && routingKey.StartsWith(e[..^2]));
                }
                catch
                {
                    return false;
                }
            }).ToList();

            _logger.LogInformation("📨 [MS.G.Webhooks Evento Consumido] Tópico: '{Key}' | Tamaño: {Bytes} B | Suscriptores activos: {Count}",
                routingKey, payload.Length, matched.Count);

            foreach (var sub in matched)
            {
                try
                {
                    using var content = new StringContent(payload, Encoding.UTF8, "application/json");
                    content.Headers.Add("X-Aerocache-Event", routingKey);
                    content.Headers.Add("X-Aerocache-Delivery", Guid.NewGuid().ToString("N"));

                    var response = await _httpClient.PostAsync(sub.Url, content, cancellationToken);
                    _logger.LogInformation("✓ [Webhook Despachado] Destino: {Url} | Status: {Status}", sub.Url, response.StatusCode);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("❌ [Webhook Falló] Destino: {Url} | Error: {Msg}", sub.Url, ex.Message);
                }
            }
        }
    }
}

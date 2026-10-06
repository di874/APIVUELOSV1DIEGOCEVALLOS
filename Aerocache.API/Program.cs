using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using Aerocache.API.Middleware;
using Aerocache.Business;
using Aerocache.DataAccess;
using Aerocache.DataAccess.Context;
using Aerocache.DataAccess.Seed;
using Aerocache.DataManagement;

var builder = WebApplication.CreateBuilder(args);

// Support dynamic port provided by hosting environments like Render ($PORT)
var renderPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(renderPort))
{
    builder.WebHost.UseUrls($"http://+:{renderPort}");
}

// Add Controllers with CamelCase JSON serializer
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// Register Solution Layers
builder.Services.AddDataAccess(builder.Configuration);
builder.Services.AddDataManagement();
builder.Services.AddBusiness();

// Configure CORS for Frontend integration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configure Swagger with Aerocache / LATAM Branding & exact OpenAPI specs
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "AEROCACHE - GDS Flight Core REST API",
        Version = "1.5.0",
        Description = "Microservicio REST centralizado para vuelos de Ecuador (Quito, Guayaquil y Cuenca). Búsqueda, tarifas de cabina, mapa de asientos, holds, reservas, tickets electrónicos, postventa, check-in digital y estado de vuelos.",
        Contact = new OpenApiContact
        {
            Name = "AEROCACHE Airlines Operations",
            Email = "contacto@aerocache.ec"
        }
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header usando el esquema Bearer. Ejemplo: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Seed Database automatically on startup
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AerocacheDbContext>();
    context.Database.EnsureCreated();
    AerocacheDataSeeder.SeedData(context);
}

// Global Exception handling with RFC 7807 ProblemDetails
app.UseMiddleware<ProblemDetailsExceptionMiddleware>();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "AEROCACHE Flight Core REST API v1.5");
    c.RoutePrefix = "swagger";
    c.DocumentTitle = "AEROCACHE API Documentation";
});

app.UseCors("AllowAll");

app.MapControllers();

app.Run();

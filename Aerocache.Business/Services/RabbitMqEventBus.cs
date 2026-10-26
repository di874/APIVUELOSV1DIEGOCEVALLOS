using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using Aerocache.Business.Interfaces;

namespace Aerocache.Business.Services
{
    public class RabbitMqEventBus : IEventBus, IAsyncDisposable
    {
        private readonly IConfiguration _config;
        private readonly ILogger<RabbitMqEventBus> _logger;
        private readonly string _exchangeName;
        private readonly ConnectionFactory _factory;
        private IConnection? _connection;
        private IChannel? _channel;
        private readonly SemaphoreSlim _semaphore = new(1, 1);
        private bool _isInitialized;

        public RabbitMqEventBus(IConfiguration config, ILogger<RabbitMqEventBus> logger)
        {
            _config = config;
            _logger = logger;
            _exchangeName = _config["RabbitMQ:ExchangeName"] ?? "aerocache.events";

            var host = _config["RabbitMQ:HostName"] ?? "localhost";
            var portStr = _config["RabbitMQ:Port"];
            int port = int.TryParse(portStr, out var p) ? p : 5672;
            var user = _config["RabbitMQ:UserName"] ?? "guest";
            var pass = _config["RabbitMQ:Password"] ?? "guest";

            _factory = new ConnectionFactory
            {
                HostName = host,
                Port = port,
                UserName = user,
                Password = pass,
                AutomaticRecoveryEnabled = true,
                NetworkRecoveryInterval = TimeSpan.FromSeconds(5)
            };
        }

        private async Task EnsureConnectedAsync(CancellationToken cancellationToken = default)
        {
            if (_isInitialized && _connection != null && _connection.IsOpen && _channel != null && _channel.IsOpen)
                return;

            await _semaphore.WaitAsync(cancellationToken);
            try
            {
                if (_isInitialized && _connection != null && _connection.IsOpen && _channel != null && _channel.IsOpen)
                    return;

                _logger.LogInformation("Conectando al Bus de Eventos RabbitMQ en {Host}:{Port}...", _factory.HostName, _factory.Port);
                _connection = await _factory.CreateConnectionAsync(cancellationToken);
                _channel = await _connection.CreateChannelAsync(cancellationToken: cancellationToken);

                await _channel.ExchangeDeclareAsync(
                    exchange: _exchangeName,
                    type: ExchangeType.Topic,
                    durable: true,
                    autoDelete: false,
                    arguments: null,
                    cancellationToken: cancellationToken
                );

                _isInitialized = true;
                _logger.LogInformation("✓ RabbitMQ conectado exitosamente. Exchange: '{Exchange}'", _exchangeName);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "No se pudo conectar a RabbitMQ en este momento. Los eventos operarán en modo resiliente.");
            }
            finally
            {
                _semaphore.Release();
            }
        }

        public async Task PublishAsync<T>(string routingKey, T eventData, CancellationToken cancellationToken = default)
        {
            var evt = new IntegrationEvent<T>
            {
                EventType = routingKey,
                RoutingKey = routingKey,
                Data = eventData
            };

            var json = JsonSerializer.Serialize(evt, new JsonSerializerOptions { WriteIndented = false });
            var body = Encoding.UTF8.GetBytes(json);

            try
            {
                await EnsureConnectedAsync(cancellationToken);

                if (_channel != null && _channel.IsOpen)
                {
                    var props = new BasicProperties
                    {
                        ContentType = "application/json",
                        DeliveryMode = DeliveryModes.Persistent,
                        MessageId = evt.EventId,
                        Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds())
                    };

                    await _channel.BasicPublishAsync(
                        exchange: _exchangeName,
                        routingKey: routingKey,
                        mandatory: false,
                        basicProperties: props,
                        body: body,
                        cancellationToken: cancellationToken
                    );

                    _logger.LogInformation("📢 [RabbitMQ Evento Publicado] Exchange: '{Exchange}' | RoutingKey: '{Key}' | Id: {Id}",
                        _exchangeName, routingKey, evt.EventId);
                }
                else
                {
                    _logger.LogWarning("⚠️ [RabbitMQ Standby] Canal cerrado. Evento '{Key}' registrado localmente.", routingKey);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al publicar evento '{Key}' a RabbitMQ. El sistema continúa operando normalmente.", routingKey);
            }
        }

        public async ValueTask DisposeAsync()
        {
            try
            {
                if (_channel != null)
                {
                    await _channel.CloseAsync();
                    _channel.Dispose();
                }
                if (_connection != null)
                {
                    await _connection.CloseAsync();
                    _connection.Dispose();
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Error cerrando recursos RabbitMQ");
            }
        }
    }
}

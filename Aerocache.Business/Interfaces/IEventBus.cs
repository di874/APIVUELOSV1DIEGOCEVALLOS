using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Aerocache.Business.Interfaces
{
    public interface IEventBus
    {
        Task PublishAsync<T>(string routingKey, T eventData, CancellationToken cancellationToken = default);
    }

    public class IntegrationEvent<T>
    {
        public string EventId { get; set; } = Guid.NewGuid().ToString("N");
        public string EventType { get; set; } = string.Empty;
        public string RoutingKey { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public string Producer { get; set; } = "Aerocache.API";
        public T Data { get; set; } = default!;
    }
}

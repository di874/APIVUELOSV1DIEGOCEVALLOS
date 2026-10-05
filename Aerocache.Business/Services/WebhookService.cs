using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Aerocache.Business.DTOs;
using Aerocache.Business.Exceptions;
using Aerocache.Business.Interfaces;
using Aerocache.DataAccess.Entities;
using Aerocache.DataManagement.Interfaces;

namespace Aerocache.Business.Services
{
    public class WebhookService : IWebhookService
    {
        private readonly IUnitOfWork _uow;

        public WebhookService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<List<WebhookSubscriptionDto>> ListSubscriptionsAsync()
        {
            var list = await _uow.WebhookSubscriptions.GetAllAsync();
            return list.Select(w => new WebhookSubscriptionDto
            {
                Id = w.Id.ToString(),
                Url = w.Url,
                Events = JsonSerializer.Deserialize<List<string>>(w.EventsJson) ?? new(),
                Secret = w.Secret
            }).ToList();
        }

        public async Task<WebhookSubscriptionDto> CreateSubscriptionAsync(WebhookSubscriptionDto subscription)
        {
            if (string.IsNullOrWhiteSpace(subscription.Url))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "URL del Webhook es obligatoria");

            var record = new WebhookSubscriptionRecord
            {
                Id = Guid.NewGuid(),
                Url = subscription.Url,
                EventsJson = JsonSerializer.Serialize(subscription.Events ?? new List<string>()),
                Secret = subscription.Secret ?? Guid.NewGuid().ToString("N")
            };

            await _uow.WebhookSubscriptions.AddAsync(record);
            await _uow.CompleteAsync();

            subscription.Id = record.Id.ToString();
            subscription.Secret = record.Secret;
            return subscription;
        }

        public async Task DeleteSubscriptionAsync(string id)
        {
            if (!Guid.TryParse(id, out var parsedId))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "Id inválido");

            var record = await _uow.WebhookSubscriptions.GetByIdAsync(parsedId);
            if (record != null)
            {
                _uow.WebhookSubscriptions.Remove(record);
                await _uow.CompleteAsync();
            }
        }
    }
}

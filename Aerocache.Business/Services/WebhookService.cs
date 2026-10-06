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
            var list = await _uow.SuscripcionesWebhooks.GetAllAsync();
            return list.Select(w => new WebhookSubscriptionDto
            {
                Id = w.Id.ToString(),
                Url = w.Url,
                Events = JsonSerializer.Deserialize<List<string>>(w.EventosJson) ?? new(),
                Secret = w.ClaveSecreta
            }).ToList();
        }

        public async Task<WebhookSubscriptionDto> CreateSubscriptionAsync(WebhookSubscriptionDto subscription)
        {
            if (string.IsNullOrWhiteSpace(subscription.Url))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "URL del Webhook es obligatoria");

            var record = new SuscripcionWebhook
            {
                Id = Guid.NewGuid(),
                Url = subscription.Url,
                EventosJson = JsonSerializer.Serialize(subscription.Events ?? new List<string>()),
                ClaveSecreta = subscription.Secret ?? Guid.NewGuid().ToString("N")
            };

            await _uow.SuscripcionesWebhooks.AddAsync(record);
            await _uow.CompleteAsync();

            subscription.Id = record.Id.ToString();
            subscription.Secret = record.ClaveSecreta;
            return subscription;
        }

        public async Task DeleteSubscriptionAsync(string id)
        {
            if (!Guid.TryParse(id, out var parsedId))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "Id inválido");

            var record = await _uow.SuscripcionesWebhooks.GetByIdAsync(parsedId);
            if (record != null)
            {
                _uow.SuscripcionesWebhooks.Remove(record);
                await _uow.CompleteAsync();
            }
        }
    }
}

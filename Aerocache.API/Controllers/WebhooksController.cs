using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Aerocache.Business.DTOs;
using Aerocache.Business.Interfaces;

namespace Aerocache.API.Controllers
{
    [ApiController]
    [Route("webhooks")]
    [Route("vuelos/webhooks")]
    public class WebhooksController : ControllerBase
    {
        private readonly IWebhookService _webhookService;

        public WebhooksController(IWebhookService webhookService)
        {
            _webhookService = webhookService;
        }

        /// <summary>
        /// Listar suscripciones activas de webhooks
        /// </summary>
        [HttpGet("")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(List<WebhookSubscriptionDto>), 200)]
        public async Task<IActionResult> ListWebhooks()
        {
            var result = await _webhookService.ListSubscriptionsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Registrar un nuevo webhook
        /// </summary>
        [HttpPost("")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(WebhookSubscriptionDto), 201)]
        public async Task<IActionResult> CreateWebhook([FromBody] WebhookSubscriptionDto subscription)
        {
            var result = await _webhookService.CreateSubscriptionAsync(subscription);
            return StatusCode(201, result);
        }

        /// <summary>
        /// Receptor de webhooks de Booking en Azure (v2 y v1)
        /// </summary>
        [HttpPost("/api/v2/webhooks/vuelos")]
        [HttpPost("/api/v1/webhooks/vuelos")]
        [HttpPost("/webhooks/vuelos")]
        [HttpPost("incoming")]
        [Produces("application/json")]
        public IActionResult ReceiveBookingWebhook([FromBody] System.Text.Json.JsonElement payload)
        {
            return Ok(new
            {
                success = true,
                message = "Evento de webhook recibido correctamente por el nodo de Vuelos",
                received_at = System.DateTime.UtcNow
            });
        }

        /// <summary>
        /// Eliminar suscripción de webhook
        /// </summary>
        [HttpDelete("{id}")]
        [ProducesResponseType(204)]
        public async Task<IActionResult> DeleteWebhook([FromRoute] string id)
        {
            await _webhookService.DeleteSubscriptionAsync(id);
            return NoContent();
        }
    }
}

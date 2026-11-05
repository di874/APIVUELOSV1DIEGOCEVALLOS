using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Aerocache.Business.DTOs;
using Aerocache.Business.Interfaces;

namespace Aerocache.API.Controllers
{
    [ApiController]
    public class VuelosController : ControllerBase
    {
        private readonly IVuelosService _vuelosService;
        private readonly IFlightStatusService _flightStatusService;

        public VuelosController(IVuelosService vuelosService, IFlightStatusService flightStatusService)
        {
            _vuelosService = vuelosService;
            _flightStatusService = flightStatusService;
        }

        /// <summary>
        /// Información y estado del servicio de Vuelos v2
        /// </summary>
        [HttpGet("vuelos")]
        [HttpGet("api/v2/vuelos")]
        [HttpGet("api/v1/vuelos")]
        [Produces("application/json")]
        public IActionResult GetVuelosApiInfo()
        {
            return Ok(new
            {
                service = "API de Vuelos — GDS Flight Core (RDA2)",
                version = "2.0.0",
                service_id = "NODE_VUE_EQ10",
                nodo_id = "NODE_VUE_EQ10",
                proveedor = "EcoAirlines (EQ10)",
                status = "ONLINE",
                base_url = "https://apivuelosv1diegocevallos.onrender.com",
                api_v2_url = "https://apivuelosv1diegocevallos.onrender.com/api/v2/vuelos",
                auth = new
                {
                    tipo = "OAuth2 / API Key",
                    oauth2 = new
                    {
                        token_url = "https://apivuelosv1diegocevallos.onrender.com/oauth2/token",
                        grant_type = "client_credentials",
                        client_id = "NODE_VUE_EQ10",
                        client_secret = "vuelos_sec_8e2723badb7ff635d6edefa295181d9af",
                        scopes = "flights:read flights:hold flights:book flights:cancel flights:webhooks flights:ops flights:admin"
                    },
                    api_key = new
                    {
                        header = "X-API-Key",
                        key = "bk_live_vuelos_eq10_4c2076947caa1cd76ff2cad83b719bab"
                    }
                },
                endpoints = new
                {
                    base_vuelos = "/api/v2/vuelos",
                    health = "/api/v2/vuelos/health",
                    search = "/api/v2/vuelos/search",
                    hold = "/api/v2/vuelos/offers/hold",
                    bookings = "/api/v2/vuelos/bookings",
                    flight_status = "/api/v2/vuelos/flights/{flightNumber}/status",
                    seatmap = "/api/v2/vuelos/offers/{offerId}/seatmap",
                    check_in = "/api/v2/vuelos/bookings/{bookingId}/check-in",
                    webhooks = "/api/v2/webhooks/vuelos",
                    oauth_token = "/oauth2/token"
                },
                documentacion = new
                {
                    swagger_ui = "https://apivuelosv1diegocevallos.onrender.com/swagger",
                    openapi_spec = "https://apivuelosv1diegocevallos.onrender.com/swagger/v1/swagger.json"
                }
            });
        }

        /// <summary>
        /// Salud y telemetría del nodo de vuelos (semáforo 🟢/🔴 del Panel 1)
        /// </summary>
        [HttpGet("vuelos/health")]
        [HttpGet("health")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(VuelosHealthResponse), 200)]
        public async Task<IActionResult> GetHealth()
        {
            var result = await _vuelosService.GetHealthAsync();
            return Ok(result);
        }

        /// <summary>
        /// Consulta de eventos publicados (Outbox) con CloudEvents v1.0
        /// </summary>
        [HttpGet("vuelos/eventos")]
        [HttpGet("eventos")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(VuelosEventosResponse), 200)]
        public async Task<IActionResult> GetEventos([FromQuery] int limit = 20, [FromQuery] string? after = null)
        {
            var result = await _vuelosService.GetEventosAsync(limit, after);
            return Ok(result);
        }

        /// <summary>
        /// Consultar acuerdo B2B de promociones de vuelos
        /// </summary>
        [HttpGet("vuelos/promociones/contrato")]
        [HttpGet("promociones/contrato")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(ContratoPromocionesResponse), 200)]
        public async Task<IActionResult> GetContratoPromociones()
        {
            var result = await _vuelosService.GetContratoPromocionesAsync();
            return Ok(result);
        }

        /// <summary>
        /// Actualizar acuerdo B2B de promociones de vuelos
        /// </summary>
        [HttpPut("vuelos/promociones/contrato")]
        [HttpPut("promociones/contrato")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(ContratoPromocionesUpdateResponse), 200)]
        public async Task<IActionResult> UpdateContratoPromociones([FromBody] ContratoPromocionesRequest request)
        {
            var result = await _vuelosService.UpdateContratoPromocionesAsync(request);
            return Ok(result);
        }

        /// <summary>
        /// Panel de ocupación por vuelo y cabina (operaciones)
        /// </summary>
        [HttpGet("vuelos/operaciones/vuelos")]
        [HttpGet("operaciones/vuelos")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(FlightOperationsResponse), 200)]
        public async Task<IActionResult> GetFlightOperations(
            [FromQuery] string? date = null,
            [FromQuery] string? origin = null,
            [FromQuery] string? destination = null,
            [FromQuery] string? status = null,
            [FromQuery] int limit = 20,
            [FromQuery] string? cursor = null)
        {
            var result = await _flightStatusService.GetFlightOperationsAsync(date, origin, destination, status, limit, cursor);
            return Ok(result);
        }
    }
}

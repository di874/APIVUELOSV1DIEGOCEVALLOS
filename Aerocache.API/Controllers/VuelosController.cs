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

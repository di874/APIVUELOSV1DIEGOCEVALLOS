using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Aerocache.Business.DTOs;
using Aerocache.Business.Interfaces;

namespace Aerocache.API.Controllers
{
    [ApiController]
    [Route("offers")]
    public class OffersController : ControllerBase
    {
        private readonly IHoldService _holdService;

        public OffersController(IHoldService holdService)
        {
            _holdService = holdService;
        }

        /// <summary>
        /// Bloquear inventario (Congelar precio con Hold)
        /// </summary>
        [HttpPost("hold")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(HoldResponse), 201)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 400)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 409)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 422)]
        public async Task<IActionResult> Hold([FromBody] HoldRequest request, [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey)
        {
            var result = await _holdService.CreateHoldAsync(request, idempotencyKey);
            return StatusCode(201, result);
        }

        /// <summary>
        /// Consultar estado de un hold
        /// </summary>
        [HttpGet("hold/{holdId}")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(HoldStatusResponse), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 404)]
        public async Task<IActionResult> GetHoldStatus([FromRoute] string holdId)
        {
            var result = await _holdService.GetHoldStatusAsync(holdId);
            return Ok(result);
        }

        /// <summary>
        /// Liberar hold anticipadamente
        /// </summary>
        [HttpDelete("hold/{holdId}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 404)]
        public async Task<IActionResult> ReleaseHold([FromRoute] string holdId)
        {
            await _holdService.ReleaseHoldAsync(holdId);
            return NoContent();
        }
    }
}

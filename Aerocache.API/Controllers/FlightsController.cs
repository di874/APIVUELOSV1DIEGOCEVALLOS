using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Aerocache.Business.DTOs;
using Aerocache.Business.Interfaces;

namespace Aerocache.API.Controllers
{
    [ApiController]
    [Route("flights")]
    public class FlightsController : ControllerBase
    {
        private readonly IFlightStatusService _statusService;

        public FlightsController(IFlightStatusService statusService)
        {
            _statusService = statusService;
        }

        /// <summary>
        /// Consultar estado operativo en vivo de un vuelo
        /// </summary>
        [HttpGet("{flightNumber}/status")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(FlightStatusDto), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 404)]
        public async Task<IActionResult> GetFlightStatus([FromRoute] string flightNumber, [FromQuery] string date)
        {
            var result = await _statusService.GetFlightStatusAsync(flightNumber, date);
            return Ok(result);
        }
    }
}

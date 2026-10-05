using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Aerocache.Business.DTOs;
using Aerocache.Business.Interfaces;

namespace Aerocache.API.Controllers
{
    [ApiController]
    [Route("bookings/{bookingId}")]
    public class CheckInController : ControllerBase
    {
        private readonly ICheckInService _checkInService;

        public CheckInController(ICheckInService checkInService)
        {
            _checkInService = checkInService;
        }

        /// <summary>
        /// Realizar check-in de la reserva
        /// </summary>
        [HttpPost("check-in")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(CheckInResponse), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 409)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 422)]
        public async Task<IActionResult> CheckIn([FromRoute] string bookingId)
        {
            var result = await _checkInService.PerformCheckInAsync(bookingId);
            return Ok(result);
        }

        /// <summary>
        /// Consultar pases de abordar (Boarding Passes)
        /// </summary>
        [HttpGet("boarding-passes")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(BoardingPassListResponse), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 404)]
        public async Task<IActionResult> GetBoardingPasses([FromRoute] string bookingId)
        {
            var result = await _checkInService.GetBoardingPassesAsync(bookingId);
            return Ok(result);
        }
    }
}

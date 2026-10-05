using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Aerocache.Business.DTOs;
using Aerocache.Business.Interfaces;

namespace Aerocache.API.Controllers
{
    [ApiController]
    [Route("")]
    public class SearchController : ControllerBase
    {
        private readonly IFlightSearchService _searchService;

        public SearchController(IFlightSearchService searchService)
        {
            _searchService = searchService;
        }

        /// <summary>
        /// Búsqueda de vuelos (Multidestino / Idas y Vueltas en Ecuador)
        /// </summary>
        [HttpPost("search")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(SearchResponse), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 400)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 429)]
        public async Task<IActionResult> Search([FromBody] SearchRequest request, [FromHeader(Name = "X-Device-Fingerprint")] string? deviceFingerprint)
        {
            var result = await _searchService.SearchFlightsAsync(request, deviceFingerprint);
            return Ok(result);
        }

        /// <summary>
        /// Obtener mapa de asientos por segmento
        /// </summary>
        [HttpGet("offers/{offerId}/seatmap")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(SeatMapResponse), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 404)]
        public async Task<IActionResult> GetSeatMap([FromRoute] string offerId, [FromQuery] string segmentId)
        {
            var result = await _searchService.GetSeatMapAsync(offerId, segmentId);
            return Ok(result);
        }
    }
}

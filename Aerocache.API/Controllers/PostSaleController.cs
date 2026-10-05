using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Aerocache.Business.DTOs;
using Aerocache.Business.Interfaces;

namespace Aerocache.API.Controllers
{
    [ApiController]
    [Route("bookings/{bookingId}")]
    public class PostSaleController : ControllerBase
    {
        private readonly IPostSaleService _postSaleService;

        public PostSaleController(IPostSaleService postSaleService)
        {
            _postSaleService = postSaleService;
        }

        /// <summary>
        /// Opciones de equipaje post-emisión
        /// </summary>
        [HttpGet("baggage-options")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(System.Collections.Generic.List<BaggageOptionItem>), 200)]
        public async Task<IActionResult> GetBaggageOptions([FromRoute] string bookingId)
        {
            var result = await _postSaleService.GetBaggageOptionsAsync(bookingId);
            return Ok(result);
        }

        /// <summary>
        /// Agregar maleta extra post-emisión
        /// </summary>
        [HttpPost("baggage")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(BaggageAddedResponse), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 409)]
        public async Task<IActionResult> AddBaggage(
            [FromRoute] string bookingId,
            [FromBody] AddBaggageRequest request,
            [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey)
        {
            var result = await _postSaleService.AddBaggageAsync(bookingId, request, idempotencyKey);
            return Ok(result);
        }

        /// <summary>
        /// Buscar disponibilidad para cambio de fecha
        /// </summary>
        [HttpPost("date-change/search")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(System.Collections.Generic.List<DateChangeSearchOption>), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 409)]
        public async Task<IActionResult> SearchDateChange([FromRoute] string bookingId, [FromBody] DateChangeSearchRequest request)
        {
            var result = await _postSaleService.SearchDateChangeAsync(bookingId, request);
            return Ok(result);
        }

        /// <summary>
        /// Confirmar cambio de fecha
        /// </summary>
        [HttpPost("date-change")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(BookingDetail), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 409)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 410)]
        public async Task<IActionResult> ConfirmDateChange(
            [FromRoute] string bookingId,
            [FromBody] DateChangeRequest request,
            [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey)
        {
            var result = await _postSaleService.ConfirmDateChangeAsync(bookingId, request, idempotencyKey);
            return Ok(result);
        }

        /// <summary>
        /// Cotizar reembolso por cancelación
        /// </summary>
        [HttpGet("cancellation-quote")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(CancellationQuoteResponse), 200)]
        public async Task<IActionResult> GetCancellationQuote([FromRoute] string bookingId)
        {
            var result = await _postSaleService.GetCancellationQuoteAsync(bookingId);
            return Ok(result);
        }

        /// <summary>
        /// Cancelar reserva
        /// </summary>
        [HttpPost("cancel")]
        [ProducesResponseType(200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 409)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 410)]
        public async Task<IActionResult> CancelBooking(
            [FromRoute] string bookingId,
            [FromBody] CancelBookingRequest request,
            [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey)
        {
            await _postSaleService.CancelBookingAsync(bookingId, request, idempotencyKey);
            return Ok(new { message = "Cancelación procesada exitosamente" });
        }

        /// <summary>
        /// Cambiar o seleccionar asiento post-emisión
        /// </summary>
        [HttpPut("seat")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(ChangeSeatResponse), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 400)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 404)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 409)]
        public async Task<IActionResult> ChangeSeat(
            [FromRoute] string bookingId,
            [FromBody] ChangeSeatRequest request)
        {
            var result = await _postSaleService.ChangeSeatAsync(bookingId, request);
            return Ok(result);
        }
    }
}

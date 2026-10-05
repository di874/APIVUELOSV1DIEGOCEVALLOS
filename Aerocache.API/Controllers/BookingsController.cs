using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Aerocache.Business.DTOs;
using Aerocache.Business.Interfaces;

namespace Aerocache.API.Controllers
{
    [ApiController]
    [Route("bookings")]
    public class BookingsController : ControllerBase
    {
        private readonly IBookingService _bookingService;

        public BookingsController(IBookingService bookingService)
        {
            _bookingService = bookingService;
        }

        /// <summary>
        /// Listar reservas del usuario actual (Paginado)
        /// </summary>
        [HttpGet("")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(BookingListResponse), 200)]
        public async Task<IActionResult> ListBookings(
            [FromQuery] string? pnr,
            [FromQuery] string? status,
            [FromQuery] string? createdFrom,
            [FromQuery] string? createdTo,
            [FromQuery] int limit = 10,
            [FromQuery] string? cursor = null)
        {
            var result = await _bookingService.ListBookingsAsync(pnr, status, createdFrom, createdTo, limit, cursor);
            return Ok(result);
        }

        /// <summary>
        /// Crear reserva y gestionar emisión de ticket
        /// </summary>
        [HttpPost("")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(BookingDetail), 201)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 400)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 409)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 410)]
        public async Task<IActionResult> CreateBooking([FromBody] BookingRequest request, [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey)
        {
            var result = await _bookingService.CreateBookingAsync(request, idempotencyKey);
            return StatusCode(201, result);
        }

        /// <summary>
        /// Detalle completo de reserva
        /// </summary>
        [HttpGet("{bookingId}")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(BookingDetail), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 404)]
        public async Task<IActionResult> GetBookingDetail([FromRoute] string bookingId)
        {
            var result = await _bookingService.GetBookingDetailAsync(bookingId);
            return Ok(result);
        }

        /// <summary>
        /// Consultar tickets de una reserva
        /// </summary>
        [HttpGet("{bookingId}/tickets")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(TicketListResponse), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 404)]
        public async Task<IActionResult> GetBookingTickets([FromRoute] string bookingId)
        {
            var result = await _bookingService.GetBookingTicketsAsync(bookingId);
            return Ok(result);
        }

        /// <summary>
        /// Consultar un ticket específico
        /// </summary>
        [HttpGet("{bookingId}/tickets/{ticketId}")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(TicketDto), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 404)]
        public async Task<IActionResult> GetTicket([FromRoute] string bookingId, [FromRoute] string ticketId)
        {
            var result = await _bookingService.GetTicketAsync(bookingId, ticketId);
            return Ok(result);
        }
    }
}

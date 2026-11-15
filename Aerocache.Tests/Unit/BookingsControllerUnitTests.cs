using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Xunit;
using Aerocache.API.Controllers;
using Aerocache.Business.DTOs;
using Aerocache.Business.Exceptions;
using Aerocache.Business.Interfaces;

namespace Aerocache.Tests.Unit
{
    /// <summary>
    /// Pruebas Unitarias puras del controlador BookingsController.
    /// Aíslan por completo la capa HTTP/Controller mediante un Spy/Mock de IBookingService
    /// para verificar códigos de estado (200, 201), delegación de parámetros, headers
    /// (Idempotency-Key, X-User-Id) y propagación de excepciones de negocio (RFC 7807).
    /// </summary>
    public class BookingsControllerUnitTests
    {
        private sealed class FakeBookingServiceSpy : IBookingService
        {
            public (string? Pnr, string? Status, string? CreatedFrom, string? CreatedTo, int Limit, string? Cursor, string? Email, string? UserId, string? LastName) LastListArgs { get; private set; }
            public (BookingRequest? Request, string? IdempotencyKey, string? UserId) LastCreateArgs { get; private set; }
            public (string? BookingId, string? UserId) LastGetDetailArgs { get; private set; }
            public string? LastGetTicketsBookingId { get; private set; }
            public (string? BookingId, string? TicketId) LastGetTicketArgs { get; private set; }
            public (string? BookingId, string? IdempotencyKey) LastIssueTicketsArgs { get; private set; }
            public (string? BookingId, SeatChangeRequest? Request, string? IdempotencyKey) LastChangeSeatsArgs { get; private set; }

            public Exception? ExceptionToThrow { get; set; }

            public BookingListResponse ListResponseToReturn { get; set; } = new();
            public BookingDetail DetailResponseToReturn { get; set; } = new();
            public TicketListResponse TicketListToReturn { get; set; } = new();
            public TicketDto TicketToReturn { get; set; } = new();
            public TicketIssuanceResponse IssuanceToReturn { get; set; } = new();
            public SeatChangeResponse SeatChangeToReturn { get; set; } = new();

            public Task<BookingListResponse> ListBookingsAsync(
                string? pnr, string? status, string? createdFrom, string? createdTo,
                int limit, string? cursor, string? email = null, string? userId = null, string? lastName = null)
            {
                if (ExceptionToThrow != null) throw ExceptionToThrow;
                LastListArgs = (pnr, status, createdFrom, createdTo, limit, cursor, email, userId, lastName);
                return Task.FromResult(ListResponseToReturn);
            }

            public Task<BookingDetail> CreateBookingAsync(BookingRequest request, string? idempotencyKey, string? userId = null)
            {
                if (ExceptionToThrow != null) throw ExceptionToThrow;
                LastCreateArgs = (request, idempotencyKey, userId);
                return Task.FromResult(DetailResponseToReturn);
            }

            public Task<BookingDetail> GetBookingDetailAsync(string bookingId, string? userId = null)
            {
                if (ExceptionToThrow != null) throw ExceptionToThrow;
                LastGetDetailArgs = (bookingId, userId);
                return Task.FromResult(DetailResponseToReturn);
            }

            public Task<TicketListResponse> GetBookingTicketsAsync(string bookingId)
            {
                if (ExceptionToThrow != null) throw ExceptionToThrow;
                LastGetTicketsBookingId = bookingId;
                return Task.FromResult(TicketListToReturn);
            }

            public Task<TicketDto> GetTicketAsync(string bookingId, string ticketId)
            {
                if (ExceptionToThrow != null) throw ExceptionToThrow;
                LastGetTicketArgs = (bookingId, ticketId);
                return Task.FromResult(TicketToReturn);
            }

            public Task<TicketIssuanceResponse> IssueTicketsAsync(string bookingId, string? idempotencyKey)
            {
                if (ExceptionToThrow != null) throw ExceptionToThrow;
                LastIssueTicketsArgs = (bookingId, idempotencyKey);
                return Task.FromResult(IssuanceToReturn);
            }

            public Task<SeatChangeResponse> ChangeSeatsV2Async(string bookingId, SeatChangeRequest request, string? idempotencyKey)
            {
                if (ExceptionToThrow != null) throw ExceptionToThrow;
                LastChangeSeatsArgs = (bookingId, request, idempotencyKey);
                return Task.FromResult(SeatChangeToReturn);
            }
        }

        [Fact]
        public async Task ListBookings_ForwardsAllQueryAndHeaderParameters_AndReturns200Ok()
        {
            // Arrange
            var spy = new FakeBookingServiceSpy
            {
                ListResponseToReturn = new BookingListResponse
                {
                    NextCursor = "cur-2",
                    Items = new List<BookingSummaryItem>
                    {
                        new() { BookingId = "b-1", Pnr = "AC1234X", Status = "CONFIRMED", Origin = "UIO", Destination = "GYE" }
                    }
                }
            };
            var controller = new BookingsController(spy);

            // Act
            var actionResult = await controller.ListBookings(
                pnr: "AC1234X",
                status: "CONFIRMED",
                createdFrom: "2026-01-01",
                createdTo: "2026-12-31",
                limit: 25,
                cursor: "cur-1",
                email: "cliente@aerocache.ec",
                lastName: "Cevallos",
                userId: "usr-999");

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            Assert.Equal(200, okResult.StatusCode ?? 200);
            var payload = Assert.IsType<BookingListResponse>(okResult.Value);
            Assert.Single(payload.Items);
            Assert.Equal("AC1234X", payload.Items[0].Pnr);

            Assert.Equal("AC1234X", spy.LastListArgs.Pnr);
            Assert.Equal("CONFIRMED", spy.LastListArgs.Status);
            Assert.Equal("2026-01-01", spy.LastListArgs.CreatedFrom);
            Assert.Equal("2026-12-31", spy.LastListArgs.CreatedTo);
            Assert.Equal(25, spy.LastListArgs.Limit);
            Assert.Equal("cur-1", spy.LastListArgs.Cursor);
            Assert.Equal("cliente@aerocache.ec", spy.LastListArgs.Email);
            Assert.Equal("Cevallos", spy.LastListArgs.LastName);
            Assert.Equal("usr-999", spy.LastListArgs.UserId);
        }

        [Fact]
        public async Task ListBookings_UsesDefaultPaginationLimit10_WhenOmitted()
        {
            // Arrange
            var spy = new FakeBookingServiceSpy();
            var controller = new BookingsController(spy);

            // Act
            var actionResult = await controller.ListBookings(null, null, null, null);

            // Assert
            Assert.IsType<OkObjectResult>(actionResult);
            Assert.Equal(10, spy.LastListArgs.Limit);
            Assert.Null(spy.LastListArgs.Cursor);
            Assert.Null(spy.LastListArgs.UserId);
        }

        [Fact]
        public async Task CreateBooking_ValidRequest_Returns201Created_AndPassesIdempotencyAndUserHeaders()
        {
            // Arrange
            var expectedDetail = new BookingDetail
            {
                BookingId = Guid.NewGuid().ToString(),
                Pnr = "AC7788X",
                Status = "CONFIRMED",
                GrandTotal = new MoneyAmount { Currency = "USD", Total = "112.70" }
            };
            var spy = new FakeBookingServiceSpy { DetailResponseToReturn = expectedDetail };
            var controller = new BookingsController(spy);

            var request = new BookingRequest
            {
                HoldId = Guid.NewGuid().ToString(),
                Payment = new PaymentReference { PaymentReferenceValue = "PAY-123" }
            };

            // Act
            var actionResult = await controller.CreateBooking(request, "idem-key-001", "usr-ecu-01");

            // Assert
            var objectResult = Assert.IsType<ObjectResult>(actionResult);
            Assert.Equal(201, objectResult.StatusCode);
            var actualDetail = Assert.IsType<BookingDetail>(objectResult.Value);
            Assert.Equal("AC7788X", actualDetail.Pnr);
            Assert.Equal(request, spy.LastCreateArgs.Request);
            Assert.Equal("idem-key-001", spy.LastCreateArgs.IdempotencyKey);
            Assert.Equal("usr-ecu-01", spy.LastCreateArgs.UserId);
        }

        [Theory]
        [InlineData(400, "VALIDATION_FAILED", "HoldId inválido")]
        [InlineData(409, "ALREADY_CANCELLED", "Hold ya consumido")]
        [InlineData(410, "HOLD_EXPIRED", "Hold expirado")]
        [InlineData(422, "AMOUNT_MISMATCH", "Monto no coincide")]
        public async Task CreateBooking_WhenServiceThrowsProblemException_PropagatesExactException(int status, string code, string title)
        {
            // Arrange
            var spy = new FakeBookingServiceSpy
            {
                ExceptionToThrow = new AerocacheProblemException(status, code, title)
            };
            var controller = new BookingsController(spy);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<AerocacheProblemException>(() =>
                controller.CreateBooking(new BookingRequest(), "idem-1", "usr-1"));

            Assert.Equal(status, ex.StatusCode);
            Assert.Equal(code, ex.Code);
            Assert.Equal(title, ex.Title);
        }

        [Fact]
        public async Task GetBookingDetail_Returns200Ok_AndPassesBookingIdAndUserId()
        {
            // Arrange
            var bookingId = Guid.NewGuid().ToString();
            var spy = new FakeBookingServiceSpy
            {
                DetailResponseToReturn = new BookingDetail { BookingId = bookingId, Pnr = "AC9900X" }
            };
            var controller = new BookingsController(spy);

            // Act
            var result = await controller.GetBookingDetail(bookingId, "usr-owner-1");

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var detail = Assert.IsType<BookingDetail>(okResult.Value);
            Assert.Equal(bookingId, detail.BookingId);
            Assert.Equal(bookingId, spy.LastGetDetailArgs.BookingId);
            Assert.Equal("usr-owner-1", spy.LastGetDetailArgs.UserId);
        }

        [Fact]
        public async Task GetBookingTickets_Returns200Ok_WithTicketListResponse()
        {
            // Arrange
            var bookingId = Guid.NewGuid().ToString();
            var spy = new FakeBookingServiceSpy
            {
                TicketListToReturn = new TicketListResponse
                {
                    BookingId = bookingId,
                    Tickets = new List<TicketDto> { new() { TicketId = "TK-1001", ETicketNumber = "045-123456789" } }
                }
            };
            var controller = new BookingsController(spy);

            // Act
            var result = await controller.GetBookingTickets(bookingId);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<TicketListResponse>(okResult.Value);
            Assert.Equal(bookingId, response.BookingId);
            Assert.Single(response.Tickets);
            Assert.Equal(bookingId, spy.LastGetTicketsBookingId);
        }

        [Fact]
        public async Task GetTicket_Returns200Ok_WithSpecificTicketDto()
        {
            // Arrange
            var spy = new FakeBookingServiceSpy
            {
                TicketToReturn = new TicketDto { TicketId = "TK-ABCD1234", BookingId = "b-1", Status = "ISSUED" }
            };
            var controller = new BookingsController(spy);

            // Act
            var result = await controller.GetTicket("b-1", "TK-ABCD1234");

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var ticket = Assert.IsType<TicketDto>(okResult.Value);
            Assert.Equal("TK-ABCD1234", ticket.TicketId);
            Assert.Equal(("b-1", "TK-ABCD1234"), spy.LastGetTicketArgs);
        }

        [Fact]
        public async Task IssueTickets_Returns200Ok_AndForwardsIdempotencyKey()
        {
            // Arrange
            var spy = new FakeBookingServiceSpy
            {
                IssuanceToReturn = new TicketIssuanceResponse { BookingId = "b-55", Pnr = "AC5555X", Issued = 2 }
            };
            var controller = new BookingsController(spy);

            // Act
            var result = await controller.IssueTickets("b-55", "idem-ticket-99");

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var issuance = Assert.IsType<TicketIssuanceResponse>(okResult.Value);
            Assert.Equal(2, issuance.Issued);
            Assert.Equal(("b-55", "idem-ticket-99"), spy.LastIssueTicketsArgs);
        }

        [Fact]
        public async Task ChangeSeats_Returns200Ok_AndDelegatesToChangeSeatsV2Async()
        {
            // Arrange
            var spy = new FakeBookingServiceSpy
            {
                SeatChangeToReturn = new SeatChangeResponse
                {
                    BookingId = "b-77",
                    Seats = new List<SeatChangeItemResponse>
                    {
                        new() { PassengerId = "pax-1", PreviousSeatNumber = "12A", SeatNumber = "14C", Status = "CONFIRMED" }
                    }
                }
            };
            var controller = new BookingsController(spy);
            var req = new SeatChangeRequest
            {
                Seats = new List<SeatChangeRequestItem> { new() { PassengerId = "pax-1", SeatNumber = "14C" } }
            };

            // Act
            var result = await controller.ChangeSeats("b-77", req, "idem-seat-01");

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<SeatChangeResponse>(okResult.Value);
            Assert.Single(response.Seats);
            Assert.Equal("14C", response.Seats[0].SeatNumber);
            Assert.Equal("b-77", spy.LastChangeSeatsArgs.BookingId);
            Assert.Equal(req, spy.LastChangeSeatsArgs.Request);
            Assert.Equal("idem-seat-01", spy.LastChangeSeatsArgs.IdempotencyKey);
        }
    }
}

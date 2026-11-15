using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Aerocache.Business.DTOs;
using Aerocache.Business.Exceptions;
using Aerocache.Business.Interfaces;
using Aerocache.Business.Services;
using Aerocache.DataAccess.Context;
using Aerocache.DataAccess.Entities;
using Aerocache.DataManagement.Repositories;

namespace Aerocache.Tests.Unit
{
    /// <summary>
    /// Pruebas Unitarias de la lógica de negocio en BookingService (capa subyacente de BookingsController).
    /// Evalúa todas las reglas de validación, estados de Hold, tolerancia de precios, códigos ISO de nacionalidad,
    /// colisión de asientos, aislamiento multi-tenant (X-User-Id) y publicación de eventos en IEventBus.
    /// </summary>
    public class BookingServiceUnitTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AerocacheDbContext _dbContext;
        private readonly UnitOfWork _uow;
        private readonly SpyEventBus _eventBus;
        private readonly BookingService _sut;

        private sealed class SpyEventBus : IEventBus
        {
            public List<(string RoutingKey, object Message)> PublishedEvents { get; } = new();

            public Task PublishAsync<T>(string routingKey, T message, System.Threading.CancellationToken cancellationToken = default)
            {
                PublishedEvents.Add((routingKey, message!));
                return Task.CompletedTask;
            }
        }

        public BookingServiceUnitTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<AerocacheDbContext>()
                .UseSqlite(_connection)
                .Options;

            _dbContext = new AerocacheDbContext(options);
            _dbContext.Database.EnsureCreated();

            _uow = new UnitOfWork(_dbContext);
            _eventBus = new SpyEventBus();
            _sut = new BookingService(_uow, _eventBus);
        }

        public void Dispose()
        {
            _uow.Dispose();
            _dbContext.Dispose();
            _connection.Close();
            _connection.Dispose();
        }

        private async Task<(Vuelo Flight, BloqueoTemporal Hold)> SeedValidFlightAndHoldAsync(
            string holdState = "HELD",
            int expiresInMinutes = 15,
            decimal lockedTotal = 56.35m,
            string? assignedSeats = "7A")
        {
            var flight = new Vuelo
            {
                Id = "FL-UIO-GYE-01",
                NumeroVuelo = "AC1401",
                OrigenIata = "UIO",
                DestinoIata = "GYE",
                SalidaProgramada = DateTime.UtcNow.AddDays(3),
                LlegadaProgramada = DateTime.UtcNow.AddDays(3).AddMinutes(50),
                DuracionMinutos = 50,
                Estado = "SCHEDULED"
            };

            var hold = new BloqueoTemporal
            {
                BloqueoId = Guid.NewGuid(),
                OfertaId = "OFF-FL-UIO-GYE-01",
                VueloId = flight.Id,
                ItinerarioId = "ITIN-FL-UIO-GYE-01",
                ClaseCabina = "ECONOMY",
                MarcaTarifa = "Light",
                TarifaBaseBloqueada = 49.00m,
                ImpuestosBloqueados = 7.35m,
                TotalBloqueado = lockedTotal,
                Moneda = "USD",
                Estado = holdState,
                FechaCreacion = DateTime.UtcNow,
                FechaExpiracion = DateTime.UtcNow.AddMinutes(expiresInMinutes),
                AsientosAsignados = assignedSeats
            };

            await _uow.Vuelos.AddAsync(flight);
            await _uow.BloqueosTemporales.AddAsync(hold);
            await _uow.CompleteAsync();

            return (flight, hold);
        }

        private static BookingRequest BuildValidBookingRequest(Guid holdId, string total = "56.35", string nationality = "EC", string? seat = null)
        {
            return new BookingRequest
            {
                HoldId = holdId.ToString(),
                Payment = new PaymentReference
                {
                    PaymentReferenceValue = "PAY-REF-2026-001",
                    Amount = new MoneyAmount { Currency = "USD", Total = total }
                },
                Passengers = new List<PassengerItem>
                {
                    new()
                    {
                        FirstName = "Diego",
                        LastName = "Cevallos",
                        DocumentType = "NATIONAL_ID",
                        DocumentNumber = "1712345678",
                        Nationality = nationality,
                        BirthDate = "1998-05-14",
                        Gender = "M",
                        Contact = new ContactInfo { Email = "diego@epn.edu.ec", Phone = "+593991234567" },
                        AssignedSeats = seat != null
                            ? new List<AssignedSeatDto> { new() { SegmentId = "SEG-1", SeatNumber = seat } }
                            : null
                    }
                }
            };
        }

        [Fact]
        public async Task CreateBookingAsync_InvalidGuidHoldId_Throws400ValidationFailed()
        {
            var req = new BookingRequest { HoldId = "not-a-guid" };

            var ex = await Assert.ThrowsAsync<AerocacheProblemException>(() =>
                _sut.CreateBookingAsync(req, "idem-1"));

            Assert.Equal(400, ex.StatusCode);
            Assert.Equal("VALIDATION_FAILED", ex.Code);
        }

        [Fact]
        public async Task CreateBookingAsync_NonExistentHold_Throws404OfferNoLongerAvailable()
        {
            var req = BuildValidBookingRequest(Guid.NewGuid());

            var ex = await Assert.ThrowsAsync<AerocacheProblemException>(() =>
                _sut.CreateBookingAsync(req, "idem-1"));

            Assert.Equal(404, ex.StatusCode);
            Assert.Equal("OFFER_NO_LONGER_AVAILABLE", ex.Code);
        }

        [Theory]
        [InlineData("EXPIRED", 10)]
        [InlineData("HELD", -5)]
        public async Task CreateBookingAsync_ExpiredHoldByStateOrClock_Throws410HoldExpired(string state, int minutesOffset)
        {
            var (_, hold) = await SeedValidFlightAndHoldAsync(holdState: state, expiresInMinutes: minutesOffset);
            var req = BuildValidBookingRequest(hold.BloqueoId);

            var ex = await Assert.ThrowsAsync<AerocacheProblemException>(() =>
                _sut.CreateBookingAsync(req, "idem-1"));

            Assert.Equal(410, ex.StatusCode);
            Assert.Equal("HOLD_EXPIRED", ex.Code);
        }

        [Fact]
        public async Task CreateBookingAsync_AlreadyConsumedHold_Throws409AlreadyCancelled()
        {
            var (_, hold) = await SeedValidFlightAndHoldAsync(holdState: "CONSUMED");
            var req = BuildValidBookingRequest(hold.BloqueoId);

            var ex = await Assert.ThrowsAsync<AerocacheProblemException>(() =>
                _sut.CreateBookingAsync(req, "idem-1"));

            Assert.Equal(409, ex.StatusCode);
            Assert.Equal("ALREADY_CANCELLED", ex.Code);
        }

        [Fact]
        public async Task CreateBookingAsync_EmptyPaymentReference_Throws400PaymentReferenceInvalid()
        {
            var (_, hold) = await SeedValidFlightAndHoldAsync();
            var req = BuildValidBookingRequest(hold.BloqueoId);
            req.Payment.PaymentReferenceValue = "   ";

            var ex = await Assert.ThrowsAsync<AerocacheProblemException>(() =>
                _sut.CreateBookingAsync(req, "idem-1"));

            Assert.Equal(400, ex.StatusCode);
            Assert.Equal("PAYMENT_REFERENCE_INVALID", ex.Code);
        }

        [Fact]
        public async Task CreateBookingAsync_PaymentAmountMismatchBeyondTolerance_Throws422AmountMismatch()
        {
            var (_, hold) = await SeedValidFlightAndHoldAsync(lockedTotal: 56.35m);
            var req = BuildValidBookingRequest(hold.BloqueoId, total: "60.00");

            var ex = await Assert.ThrowsAsync<AerocacheProblemException>(() =>
                _sut.CreateBookingAsync(req, "idem-1"));

            Assert.Equal(422, ex.StatusCode);
            Assert.Equal("AMOUNT_MISMATCH", ex.Code);
        }

        [Theory]
        [InlineData("ECU")]
        [InlineData("E")]
        [InlineData("12")]
        [InlineData("")]
        public async Task CreateBookingAsync_InvalidPassengerIsoNationality_Throws400InvalidNationality(string badNat)
        {
            var (_, hold) = await SeedValidFlightAndHoldAsync();
            var req = BuildValidBookingRequest(hold.BloqueoId, nationality: badNat);

            var ex = await Assert.ThrowsAsync<AerocacheProblemException>(() =>
                _sut.CreateBookingAsync(req, "idem-1"));

            Assert.Equal(400, ex.StatusCode);
            Assert.Equal("INVALID_NATIONALITY", ex.Code);
        }

        [Fact]
        public async Task CreateBookingAsync_WhenSeatAlreadyOccupiedInConfirmedBooking_Throws409SeatTaken()
        {
            var (flight, hold) = await SeedValidFlightAndHoldAsync(assignedSeats: null);

            // Seed an existing confirmed booking occupying seat 10A
            var existingBooking = new Reserva
            {
                ReservaId = Guid.NewGuid(),
                Pnr = "AC1111X",
                Estado = "CONFIRMED",
                VueloId = flight.Id,
                OrigenIata = "UIO",
                DestinoIata = "GYE",
                FechaSalida = flight.SalidaProgramada,
                Pasajeros = new List<Pasajero>
                {
                    new() { Nombre = "Ana", Apellido = "Loja", NumeroAsientoAsignado = "10A" }
                }
            };
            await _uow.Reservas.AddAsync(existingBooking);
            await _uow.CompleteAsync();

            var req = BuildValidBookingRequest(hold.BloqueoId, seat: "10a"); // case-insensitive check

            var ex = await Assert.ThrowsAsync<AerocacheProblemException>(() =>
                _sut.CreateBookingAsync(req, "idem-1"));

            Assert.Equal(409, ex.StatusCode);
            Assert.Equal("SEAT_TAKEN", ex.Code);
        }

        [Fact]
        public async Task CreateBookingAsync_ValidRequest_MarksHoldConsumedCreatesTicketAndPublishesEvent()
        {
            var (_, hold) = await SeedValidFlightAndHoldAsync(assignedSeats: "9B");
            var req = BuildValidBookingRequest(hold.BloqueoId, seat: null); // Should inherit 9B from hold

            var detail = await _sut.CreateBookingAsync(req, "idem-ok", "usr-diego");

            Assert.NotNull(detail);
            Assert.Equal("CONFIRMED", detail.Status);
            Assert.Contains("AC", detail.Pnr);
            Assert.Single(detail.Passengers);
            Assert.Equal("9B", detail.Passengers[0].AssignedSeats![0].SeatNumber);
            Assert.Single(detail.Tickets);
            Assert.Equal("ISSUED", detail.Tickets[0].Status);
            Assert.Contains("045-", detail.Tickets[0].ETicketNumber);

            var updatedHold = await _uow.BloqueosTemporales.GetByIdAsync(hold.BloqueoId);
            Assert.Equal("CONSUMED", updatedHold!.Estado);

            Assert.Single(_eventBus.PublishedEvents);
            Assert.Equal("booking.confirmed", _eventBus.PublishedEvents[0].RoutingKey);
        }

        [Fact]
        public async Task GetBookingDetailAsync_WhenDifferentUserIdProvided_Throws404ForTenantIsolation()
        {
            var (_, hold) = await SeedValidFlightAndHoldAsync();
            var req = BuildValidBookingRequest(hold.BloqueoId);
            var created = await _sut.CreateBookingAsync(req, "idem-1", "usr-owner-A");

            // Same owner succeeds
            var ownerView = await _sut.GetBookingDetailAsync(created.BookingId, "usr-owner-A");
            Assert.Equal(created.BookingId, ownerView.BookingId);

            // Different owner gets 404 BOOKING_NOT_FOUND
            var ex = await Assert.ThrowsAsync<AerocacheProblemException>(() =>
                _sut.GetBookingDetailAsync(created.BookingId, "usr-intruder-B"));

            Assert.Equal(404, ex.StatusCode);
            Assert.Equal("BOOKING_NOT_FOUND", ex.Code);
        }

        [Fact]
        public async Task ChangeSeatsV2Async_EmptySeatsCollection_Throws400InvalidSeatRequest()
        {
            var (_, hold) = await SeedValidFlightAndHoldAsync();
            var created = await _sut.CreateBookingAsync(BuildValidBookingRequest(hold.BloqueoId), "idem-1");

            var ex = await Assert.ThrowsAsync<AerocacheProblemException>(() =>
                _sut.ChangeSeatsV2Async(created.BookingId, new SeatChangeRequest { Seats = new() }, "idem-2"));

            Assert.Equal(400, ex.StatusCode);
            Assert.Equal("INVALID_SEAT_REQUEST", ex.Code);
        }
    }
}

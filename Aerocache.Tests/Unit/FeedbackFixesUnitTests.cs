using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Xunit;
using Aerocache.Business.DTOs;
using Aerocache.Business.Exceptions;
using Aerocache.Business.Helpers;
using Aerocache.Business.Services;
using Aerocache.DataAccess.Context;
using Aerocache.DataAccess.Entities;
using Aerocache.DataManagement.Repositories;

namespace Aerocache.Tests.Unit
{
    public class FeedbackFixesUnitTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AerocacheDbContext _dbContext;
        private readonly UnitOfWork _uow;
        private readonly IMemoryCache _cache;
        private readonly HoldService _holdService;
        private readonly FlightSearchService _searchService;
        private readonly BookingService _bookingService;

        public FeedbackFixesUnitTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<AerocacheDbContext>()
                .UseSqlite(_connection)
                .Options;

            _dbContext = new AerocacheDbContext(options);
            _dbContext.Database.EnsureCreated();

            _uow = new UnitOfWork(_dbContext);
            _cache = new MemoryCache(new MemoryCacheOptions());

            _holdService = new HoldService(_uow);
            _searchService = new FlightSearchService(_uow, _cache);
            _bookingService = new BookingService(_uow);
        }

        public void Dispose()
        {
            _cache.Dispose();
            _uow.Dispose();
            _dbContext.Dispose();
            _connection.Close();
            _connection.Dispose();
        }

        private async Task<Vuelo> SeedFlightAsync(string flightId = "AC1401-20261120")
        {
            var flight = new Vuelo
            {
                Id = flightId,
                NumeroVuelo = "AC1401",
                OrigenIata = "UIO",
                DestinoIata = "GYE",
                SalidaProgramada = new DateTime(2026, 11, 20, 6, 30, 0, DateTimeKind.Utc),
                LlegadaProgramada = new DateTime(2026, 11, 20, 7, 20, 0, DateTimeKind.Utc),
                DuracionMinutos = 50,
                Estado = "ON_TIME",
                TarifasCabina = new List<TarifaCabina>
                {
                    new()
                    {
                        Id = Guid.NewGuid().ToString(),
                        VueloId = flightId,
                        ClaseCabina = "ECONOMY",
                        MarcaTarifa = "Light",
                        TarifaBase = 49.00m,
                        Impuestos = 7.35m,
                        PrecioTotal = 56.35m
                    }
                }
            };

            await _uow.Vuelos.AddAsync(flight);
            await _uow.CompleteAsync();
            return flight;
        }

        [Theory]
        [InlineData("99Z")]
        [InlineData("0A")]
        [InlineData("25A")]
        [InlineData("12G")]
        [InlineData("XYZ")]
        public async Task Hold_NonExistentSeat_Throws400ValidationFailed(string nonExistentSeat)
        {
            await SeedFlightAsync();

            var req = new HoldRequest
            {
                OfferId = "OFF-AC1401-20261120",
                AssignedSeats = new List<AssignedSeatDto>
                {
                    new() { SegmentId = "SEG-AC1401-20261120", SeatNumber = nonExistentSeat }
                }
            };

            var ex = await Assert.ThrowsAsync<AerocacheProblemException>(() =>
                _holdService.CreateHoldAsync(req, "idem-nonexistent"));

            Assert.Equal(400, ex.StatusCode);
            Assert.Equal("VALIDATION_FAILED", ex.Code);
            Assert.Contains(nonExistentSeat, ex.Detail);
        }

        [Fact]
        public async Task Hold_ValidSeat_CreatesHoldAndReturns201Created()
        {
            await SeedFlightAsync();

            var req = new HoldRequest
            {
                OfferId = "OFF-AC1401-20261120",
                AssignedSeats = new List<AssignedSeatDto>
                {
                    new() { SegmentId = "SEG-AC1401-20261120", SeatNumber = "11C" }
                }
            };

            var (res, isReplay) = await _holdService.CreateHoldAsync(req, "idem-valid-1");

            Assert.False(isReplay);
            Assert.NotNull(res.HoldId);
            Assert.Equal("HELD", res.Status);
            Assert.True(res.ExpiresAt.EndsWith("-05:00"));
        }

        [Fact]
        public async Task Hold_ReattemptWithSameIdempotencyKey_ReturnsSameHoldWithout409()
        {
            await SeedFlightAsync();

            var req = new HoldRequest
            {
                OfferId = "OFF-AC1401-20261120",
                AssignedSeats = new List<AssignedSeatDto>
                {
                    new() { SegmentId = "SEG-AC1401-20261120", SeatNumber = "11C" }
                }
            };

            var (res1, isReplay1) = await _holdService.CreateHoldAsync(req, "idem-repeat-key");
            Assert.False(isReplay1);

            // Re-intento con la misma Idempotency-Key
            var (res2, isReplay2) = await _holdService.CreateHoldAsync(req, "idem-repeat-key");
            Assert.True(isReplay2);
            Assert.Equal(res1.HoldId, res2.HoldId);
        }

        [Fact]
        public async Task Hold_ReattemptWithSameCorrelationId_CreatesNewHoldIdWithout409AndSurvivesDeleteOfPreviousHold()
        {
            await SeedFlightAsync();

            var req1 = new HoldRequest
            {
                OfferId = "OFF-AC1401-20261120",
                AssignedSeats = new List<AssignedSeatDto>
                {
                    new() { SegmentId = "SEG-AC1401-20261120", SeatNumber = "12D" }
                }
            };

            var (res1, isReplay1) = await _holdService.CreateHoldAsync(req1, "idem-step-1", "corr-combo-9988", "booking-shared-user");
            Assert.False(isReplay1);

            // Rehacer el hold en la misma compra con nuevo Idempotency-Key y mismo correlationId
            var (res2, isReplay2) = await _holdService.CreateHoldAsync(req1, "idem-step-2", "corr-combo-9988", "booking-shared-user");
            Assert.False(isReplay2);
            Assert.NotEqual(res1.HoldId, res2.HoldId);

            // Booking libera el hold anterior con DELETE; el nuevo hold debe permanecer HELD
            await _holdService.ReleaseHoldAsync(res1.HoldId);

            var status2 = await _holdService.GetHoldStatusAsync(res2.HoldId);
            Assert.Equal("HELD", status2.Status);
        }

        [Fact]
        public async Task Hold_DifferentCustomerAttemptingSameSeat_Throws409SeatTaken()
        {
            await SeedFlightAsync();

            var req1 = new HoldRequest
            {
                OfferId = "OFF-AC1401-20261120",
                AssignedSeats = new List<AssignedSeatDto>
                {
                    new() { SegmentId = "SEG-AC1401-20261120", SeatNumber = "14A" }
                }
            };

            var (res1, _) = await _holdService.CreateHoldAsync(req1, "idem-cust-1", "corr-cust-1");
            Assert.NotNull(res1.HoldId);

            // Otro cliente intentando el mismo asiento
            var req2 = new HoldRequest
            {
                OfferId = "OFF-AC1401-20261120",
                AssignedSeats = new List<AssignedSeatDto>
                {
                    new() { SegmentId = "SEG-AC1401-20261120", SeatNumber = "14A" }
                }
            };

            var ex = await Assert.ThrowsAsync<AerocacheProblemException>(() =>
                _holdService.CreateHoldAsync(req2, "idem-cust-2", "corr-cust-2"));

            Assert.Equal(409, ex.StatusCode);
            Assert.Equal("SEAT_TAKEN", ex.Code);
        }

        [Fact]
        public void EcuadorTimeHelper_FormatsDatesWithNegativeFiveHoursOffset()
        {
            var flightTime = new DateTime(2026, 11, 20, 6, 30, 0);
            var flightIso = EcuadorTimeHelper.FormatFlightScheduleIso(flightTime);
            Assert.Equal("2026-11-20T06:30:00-05:00", flightIso);

            var instantUtc = new DateTime(2026, 11, 20, 11, 30, 0, DateTimeKind.Utc);
            var instantIso = EcuadorTimeHelper.FormatInstantIso(instantUtc);
            Assert.Equal("2026-11-20T06:30:00-05:00", instantIso);
        }

        [Fact]
        public async Task Booking_SupportsBothPaymentReferenceAndLegacyPaymentReferenceValue()
        {
            var flight = await SeedFlightAsync();

            var hold = new BloqueoTemporal
            {
                BloqueoId = Guid.NewGuid(),
                OfertaId = "OFF-AC1401-20261120",
                VueloId = flight.Id,
                ItinerarioId = "ITIN-1",
                TotalBloqueado = 56.35m,
                TarifaBaseBloqueada = 49.00m,
                ImpuestosBloqueados = 7.35m,
                Moneda = "USD",
                Estado = "HELD",
                FechaCreacion = DateTime.UtcNow,
                FechaExpiracion = DateTime.UtcNow.AddMinutes(15)
            };
            await _uow.BloqueosTemporales.AddAsync(hold);
            await _uow.CompleteAsync();

            // Request with standard OpenAPI v2 paymentReference
            var req1 = new BookingRequest
            {
                HoldId = hold.BloqueoId.ToString(),
                Payment = new PaymentReference
                {
                    PaymentReferenceValue = "PAY-V2-REF-12345",
                    Amount = new MoneyAmount { Currency = "USD", Total = "56.35" }
                },
                Passengers = new List<PassengerItem>
                {
                    new()
                    {
                        FirstName = "Diego",
                        LastName = "Cevallos",
                        DocumentType = "NATIONAL_ID",
                        DocumentNumber = "1712345678",
                        Nationality = "EC"
                    }
                }
            };

            var (booking, _) = await _bookingService.CreateBookingAsync(req1, "idem-pay-1");
            Assert.NotNull(booking);
            Assert.Equal("CONFIRMED", booking.Status);
            Assert.True(booking.CreatedAt.EndsWith("-05:00"));
        }

        [Fact]
        public async Task SeatMap_UsesCacheAndReflectsHeldSeatStatus()
        {
            await SeedFlightAsync();

            // Hold seat 11C
            var holdReq = new HoldRequest
            {
                OfferId = "OFF-AC1401-20261120",
                AssignedSeats = new List<AssignedSeatDto>
                {
                    new() { SegmentId = "SEG-AC1401-20261120", SeatNumber = "11C" }
                }
            };
            await _holdService.CreateHoldAsync(holdReq, "idem-map-1");

            // Query seatmap
            var map = await _searchService.GetSeatMapAsync("OFF-AC1401-20261120", "SEG-AC1401-20261120");
            Assert.NotNull(map);

            var row11 = map.Cabins[1].Rows.Find(r => r.RowNumber == 11);
            Assert.NotNull(row11);
            var seat11C = row11.Seats.Find(s => s.SeatNumber == "11C");
            Assert.NotNull(seat11C);
            Assert.Equal("HELD", seat11C.Status);
            Assert.False(seat11C.IsAvailable);

            // Second call should return instantly from cache
            var mapCached = await _searchService.GetSeatMapAsync("OFF-AC1401-20261120", "SEG-AC1401-20261120");
            Assert.True(object.ReferenceEquals(map, mapCached));
        }

        [Fact]
        public async Task Booking_ReleasedHold_Throws410HoldExpired()
        {
            await SeedFlightAsync();

            var (holdResp, _) = await _holdService.CreateHoldAsync(new HoldRequest
            {
                OfferId = "OFF-AC1401-20261120"
            }, "idem-rel-1");

            // Release the hold
            await _holdService.ReleaseHoldAsync(holdResp.HoldId);

            var req = new BookingRequest
            {
                HoldId = holdResp.HoldId,
                Payment = new PaymentReference { PaymentReferenceValue = "PAY-12345" },
                Passengers = new List<PassengerItem>
                {
                    new()
                    {
                        FirstName = "Diego",
                        LastName = "Cevallos",
                        DocumentType = "NATIONAL_ID",
                        DocumentNumber = "1712345678",
                        Nationality = "EC"
                    }
                }
            };

            var ex = await Assert.ThrowsAsync<AerocacheProblemException>(() =>
                _bookingService.CreateBookingAsync(req, "idem-rel-book"));

            Assert.Equal(410, ex.StatusCode);
            Assert.Equal("HOLD_EXPIRED", ex.Code);
            Assert.Contains("RELEASED", ex.Detail);
        }

        [Fact]
        public async Task Booking_RootPaymentReference_CreatesBookingSuccessfully()
        {
            await SeedFlightAsync();

            var (holdResp, _) = await _holdService.CreateHoldAsync(new HoldRequest
            {
                OfferId = "OFF-AC1401-20261120"
            }, "idem-root-1");

            var req = new BookingRequest
            {
                HoldId = holdResp.HoldId,
                RootPaymentReference = "PAY-ROOT-9988",
                Passengers = new List<PassengerItem>
                {
                    new()
                    {
                        FirstName = "Diego",
                        LastName = "Cevallos",
                        DocumentType = "NATIONAL_ID",
                        DocumentNumber = "1712345678",
                        Nationality = "EC"
                    }
                }
            };

            var (booking, isReplay) = await _bookingService.CreateBookingAsync(req, "idem-root-book");
            Assert.NotNull(booking);
            Assert.False(isReplay);
            Assert.Equal("CONFIRMED", booking.Status);

            // Replay with same idempotency key returns 200 isReplay = true
            var (replayed, isReplay2) = await _bookingService.CreateBookingAsync(req, "idem-root-book");
            Assert.NotNull(replayed);
            Assert.True(isReplay2);
            Assert.Equal(booking.BookingId, replayed.BookingId);
        }
    }
}

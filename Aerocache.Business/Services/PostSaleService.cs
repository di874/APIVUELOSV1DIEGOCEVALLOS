using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Aerocache.Business.DTOs;
using Aerocache.Business.Exceptions;
using Aerocache.Business.Interfaces;
using Aerocache.DataAccess.Entities;
using Aerocache.DataManagement.Interfaces;

namespace Aerocache.Business.Services
{
    public class PostSaleService : IPostSaleService
    {
        private readonly IUnitOfWork _uow;

        public PostSaleService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<List<BaggageOptionItem>> GetBaggageOptionsAsync(string bookingId)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var booking = await _uow.Bookings.Query()
                .Include(b => b.Passengers)
                .FirstOrDefaultAsync(b => b.BookingId == id);

            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            return booking.Passengers.Select(p => new BaggageOptionItem
            {
                PassengerId = p.Id,
                ItineraryId = booking.ItineraryId ?? "ITIN-1",
                MaxAllowed = 3,
                AlreadyPurchased = p.ExtraBaggageQuantity,
                Price = new MoneyAmount
                {
                    Currency = "USD",
                    Total = "20.00"
                }
            }).ToList();
        }

        public async Task<BaggageAddedResponse> AddBaggageAsync(string bookingId, AddBaggageRequest request, string? idempotencyKey)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var booking = await _uow.Bookings.Query()
                .Include(b => b.Passengers)
                .FirstOrDefaultAsync(b => b.BookingId == id);

            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            var passenger = booking.Passengers.FirstOrDefault(p => p.Id == request.PassengerId);
            if (passenger == null)
                throw new AerocacheProblemException(404, "VALIDATION_FAILED", "Pasajero no encontrado en la reserva");

            if (passenger.ExtraBaggageQuantity + request.Quantity > 3)
            {
                throw new AerocacheProblemException(409, "BAGGAGE_LIMIT_EXCEEDED", "Límite de maletas alcanzado (máximo 3 por pasajero)");
            }

            passenger.ExtraBaggageQuantity += request.Quantity;
            booking.GrandTotalAmount += (20.00m * request.Quantity);
            booking.UpdatedAt = DateTime.UtcNow;

            await _uow.CompleteAsync();

            return new BaggageAddedResponse
            {
                PassengerId = passenger.Id,
                ItineraryId = request.ItineraryId,
                TotalBaggage = passenger.ExtraBaggageQuantity
            };
        }

        public async Task<List<DateChangeSearchOption>> SearchDateChangeAsync(string bookingId, DateChangeSearchRequest request)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var booking = await _uow.Bookings.GetByIdAsync(id);
            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            var changeItem = request.Changes.FirstOrDefault();
            DateTime newDate = DateTime.TryParse(changeItem?.NewDepartureDate, out var parsed) ? parsed : DateTime.UtcNow.AddDays(7);

            var offer = new DateChangeOfferRecord
            {
                ChangeOfferId = "CHG-" + Guid.NewGuid().ToString("N")[..8].ToUpper(),
                BookingId = booking.BookingId,
                NewDepartureDate = newDate,
                FareDifference = 10.00m,
                TaxDifference = 1.50m,
                ChangeFee = 15.00m,
                TotalToPay = 26.50m,
                ExpiresAt = DateTime.UtcNow.AddMinutes(20)
            };

            await _uow.DateChangeOffers.AddAsync(offer);
            await _uow.CompleteAsync();

            return new List<DateChangeSearchOption>
            {
                new()
                {
                    ChangeOfferId = offer.ChangeOfferId,
                    ExpiresAt = offer.ExpiresAt.ToString("o"),
                    Segments = new List<FlightSegmentDto>
                    {
                        new()
                        {
                            SegmentId = $"SEG-CHG-{booking.FlightId}",
                            FlightNumber = "AC1403",
                            MarketingCarrier = "AC",
                            OperatingCarrier = "AC",
                            DurationMinutes = 50,
                            Departure = new FlightEndpoint { IataCode = booking.OriginIata, At = newDate.AddHours(10).ToString("o") },
                            Arrival = new FlightEndpoint { IataCode = booking.DestinationIata, At = newDate.AddHours(10).AddMinutes(50).ToString("o") }
                        }
                    },
                    PriceDifference = new PriceDifferenceDto
                    {
                        FareDifference = offer.FareDifference.ToString("F2", CultureInfo.InvariantCulture),
                        TaxDifference = offer.TaxDifference.ToString("F2", CultureInfo.InvariantCulture),
                        ChangeFee = offer.ChangeFee.ToString("F2", CultureInfo.InvariantCulture),
                        TotalToPay = offer.TotalToPay.ToString("F2", CultureInfo.InvariantCulture)
                    }
                }
            };
        }

        public async Task<BookingDetail> ConfirmDateChangeAsync(string bookingId, DateChangeRequest request, string? idempotencyKey)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var booking = await _uow.Bookings.GetByIdAsync(id);
            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            var offer = await _uow.DateChangeOffers.FirstOrDefaultAsync(o => o.ChangeOfferId == request.ChangeOfferId);
            if (offer == null || offer.ExpiresAt < DateTime.UtcNow)
            {
                throw new AerocacheProblemException(410, "CHANGE_OFFER_EXPIRED", "La cotización de cambio de fecha ha expirado");
            }

            booking.DepartureDate = offer.NewDepartureDate;
            booking.GrandTotalAmount += offer.TotalToPay;
            booking.UpdatedAt = DateTime.UtcNow;
            booking.ChangesHistoryJson = $"Vuelo reprogramado para el {offer.NewDepartureDate:dd/MM/yyyy}. Diferencia pagada: ${offer.TotalToPay:F2}";

            await _uow.CompleteAsync();

            var bookingService = new BookingService(_uow);
            return await bookingService.GetBookingDetailAsync(bookingId);
        }

        public async Task<CancellationQuoteResponse> GetCancellationQuoteAsync(string bookingId)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var booking = await _uow.Bookings.GetByIdAsync(id);
            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            if (booking.Status == "CANCELLED")
                throw new AerocacheProblemException(409, "ALREADY_CANCELLED", "La reserva ya se encuentra cancelada");

            bool isTopFare = booking.FareBrand == "Top";
            decimal refund = isTopFare ? Math.Round(booking.GrandTotalAmount * 0.90m, 2) : Math.Round(booking.GrandTotalAmount * 0.50m, 2);
            decimal penalty = booking.GrandTotalAmount - refund;

            var quote = new CancellationQuoteRecord
            {
                QuoteId = "QTE-" + Guid.NewGuid().ToString("N")[..8].ToUpper(),
                BookingId = booking.BookingId,
                IsRefundable = true,
                RefundAmount = refund,
                PenaltyAmount = penalty,
                Currency = "USD",
                ExpiresAt = DateTime.UtcNow.AddMinutes(30)
            };

            await _uow.CancellationQuotes.AddAsync(quote);
            await _uow.CompleteAsync();

            return new CancellationQuoteResponse
            {
                QuoteId = quote.QuoteId,
                IsRefundable = quote.IsRefundable,
                RefundAmount = refund.ToString("F2", CultureInfo.InvariantCulture),
                PenaltyAmount = penalty.ToString("F2", CultureInfo.InvariantCulture),
                Currency = "USD",
                ExpiresAt = quote.ExpiresAt.ToString("o")
            };
        }

        public async Task CancelBookingAsync(string bookingId, CancelBookingRequest request, string? idempotencyKey)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var booking = await _uow.Bookings.Query()
                .Include(b => b.Tickets)
                .FirstOrDefaultAsync(b => b.BookingId == id);

            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            if (booking.Status == "CANCELLED")
                throw new AerocacheProblemException(409, "ALREADY_CANCELLED", "La reserva ya ha sido cancelada");

            var quote = await _uow.CancellationQuotes.FirstOrDefaultAsync(q => q.QuoteId == request.QuoteId);
            if (quote == null || quote.ExpiresAt < DateTime.UtcNow)
            {
                throw new AerocacheProblemException(410, "QUOTE_EXPIRED", "La cotización de cancelación ha expirado");
            }

            booking.Status = "CANCELLED";
            booking.CancellationReason = request.Reason ?? "Cancelado por solicitud del pasajero";
            booking.UpdatedAt = DateTime.UtcNow;

            foreach (var t in booking.Tickets)
            {
                t.Status = "REFUNDED";
            }

            await _uow.CompleteAsync();
        }

        public async Task<ChangeSeatResponse> ChangeSeatAsync(string bookingId, ChangeSeatRequest request)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var booking = await _uow.Bookings.Query()
                .Include(b => b.Passengers)
                .Include(b => b.BoardingPasses)
                .FirstOrDefaultAsync(b => b.BookingId == id);

            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            if (booking.Status == "CANCELLED")
                throw new AerocacheProblemException(409, "CANNOT_CHANGE_SEAT", "No se puede cambiar asiento en una reserva cancelada");

            var newSeat = request.NewSeatNumber?.Trim().ToUpperInvariant();
            if (string.IsNullOrEmpty(newSeat))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "Debe especificar el nuevo asiento");

            // Check if the seat is already occupied by another booking on this flight
            bool isTaken = await _uow.Bookings.Query()
                .Where(b => b.FlightId == booking.FlightId && b.BookingId != booking.BookingId && (b.Status == "CONFIRMED" || b.Status == "CHECKED_IN"))
                .AnyAsync(b => b.Passengers.Any(p => p.AssignedSeatNumber == newSeat));

            if (isTaken)
            {
                throw new AerocacheProblemException(409, "SEAT_NOT_AVAILABLE", "Asiento ocupado", $"El asiento {newSeat} ya se encuentra ocupado por otro pasajero.");
            }

            // Find passenger
            var passenger = string.IsNullOrEmpty(request.PassengerId)
                ? booking.Passengers.FirstOrDefault()
                : booking.Passengers.FirstOrDefault(p => p.Id == request.PassengerId);

            if (passenger == null)
                throw new AerocacheProblemException(404, "PASSENGER_NOT_FOUND", "Pasajero no encontrado en la reserva");

            passenger.AssignedSeatNumber = newSeat;

            // If boarding pass already issued, update seat on boarding pass too
            var bp = booking.BoardingPasses.FirstOrDefault(b => b.PassengerId == passenger.Id);
            if (bp != null)
            {
                bp.Seat = newSeat;
            }

            booking.UpdatedAt = DateTime.UtcNow;
            await _uow.CompleteAsync();

            return new ChangeSeatResponse
            {
                BookingId = booking.BookingId.ToString(),
                PassengerId = passenger.Id,
                SeatNumber = newSeat,
                Message = $"Asiento actualizado exitosamente a {newSeat}"
            };
        }
    }
}

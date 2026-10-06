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

            var booking = await _uow.Reservas.Query()
                .Include(b => b.Pasajeros)
                .FirstOrDefaultAsync(b => b.ReservaId == id);

            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            return booking.Pasajeros.Select(p => new BaggageOptionItem
            {
                PassengerId = p.Id,
                ItineraryId = booking.ItinerarioId ?? "ITIN-1",
                MaxAllowed = 3,
                AlreadyPurchased = p.CantidadEquipajeExtra,
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

            var booking = await _uow.Reservas.Query()
                .Include(b => b.Pasajeros)
                .FirstOrDefaultAsync(b => b.ReservaId == id);

            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            var passenger = booking.Pasajeros.FirstOrDefault(p => p.Id == request.PassengerId);
            if (passenger == null)
                throw new AerocacheProblemException(404, "VALIDATION_FAILED", "Pasajero no encontrado en la reserva");

            if (passenger.CantidadEquipajeExtra + request.Quantity > 3)
            {
                throw new AerocacheProblemException(409, "BAGGAGE_LIMIT_EXCEEDED", "Límite de maletas alcanzado (máximo 3 por pasajero)");
            }

            passenger.CantidadEquipajeExtra += request.Quantity;
            booking.MontoTotalGeneral += (20.00m * request.Quantity);
            booking.FechaActualizacion = DateTime.UtcNow;

            await _uow.CompleteAsync();

            return new BaggageAddedResponse
            {
                PassengerId = passenger.Id,
                ItineraryId = request.ItineraryId,
                TotalBaggage = passenger.CantidadEquipajeExtra
            };
        }

        public async Task<List<DateChangeSearchOption>> SearchDateChangeAsync(string bookingId, DateChangeSearchRequest request)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var booking = await _uow.Reservas.GetByIdAsync(id);
            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            var changeItem = request.Changes.FirstOrDefault();
            DateTime newDate = DateTime.TryParse(changeItem?.NewDepartureDate, out var parsed) ? parsed : DateTime.UtcNow.AddDays(7);

            var offer = new OfertaCambioFecha
            {
                OfertaCambioId = "CHG-" + Guid.NewGuid().ToString("N")[..8].ToUpper(),
                ReservaId = booking.ReservaId,
                NuevaFechaSalida = newDate,
                DiferenciaTarifa = 10.00m,
                DiferenciaImpuesto = 1.50m,
                CargoCambio = 15.00m,
                TotalPagar = 26.50m,
                FechaExpiracion = DateTime.UtcNow.AddMinutes(20)
            };

            await _uow.OfertasCambioFecha.AddAsync(offer);
            await _uow.CompleteAsync();

            return new List<DateChangeSearchOption>
            {
                new()
                {
                    ChangeOfferId = offer.OfertaCambioId,
                    ExpiresAt = offer.FechaExpiracion.ToString("o"),
                    Segments = new List<FlightSegmentDto>
                    {
                        new()
                        {
                            SegmentId = $"SEG-CHG-{booking.VueloId}",
                            FlightNumber = "AC1403",
                            MarketingCarrier = "AC",
                            OperatingCarrier = "AC",
                            DurationMinutes = 50,
                            Departure = new FlightEndpoint { IataCode = booking.OrigenIata, At = newDate.AddHours(10).ToString("o") },
                            Arrival = new FlightEndpoint { IataCode = booking.DestinoIata, At = newDate.AddHours(10).AddMinutes(50).ToString("o") }
                        }
                    },
                    PriceDifference = new PriceDifferenceDto
                    {
                        FareDifference = offer.DiferenciaTarifa.ToString("F2", CultureInfo.InvariantCulture),
                        TaxDifference = offer.DiferenciaImpuesto.ToString("F2", CultureInfo.InvariantCulture),
                        ChangeFee = offer.CargoCambio.ToString("F2", CultureInfo.InvariantCulture),
                        TotalToPay = offer.TotalPagar.ToString("F2", CultureInfo.InvariantCulture)
                    }
                }
            };
        }

        public async Task<BookingDetail> ConfirmDateChangeAsync(string bookingId, DateChangeRequest request, string? idempotencyKey)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var booking = await _uow.Reservas.GetByIdAsync(id);
            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            var offer = await _uow.OfertasCambioFecha.FirstOrDefaultAsync(o => o.OfertaCambioId == request.ChangeOfferId);
            if (offer == null || offer.FechaExpiracion < DateTime.UtcNow)
            {
                throw new AerocacheProblemException(410, "CHANGE_OFFER_EXPIRED", "La cotización de cambio de fecha ha expirado");
            }

            booking.FechaSalida = offer.NuevaFechaSalida;
            booking.MontoTotalGeneral += offer.TotalPagar;
            booking.FechaActualizacion = DateTime.UtcNow;
            booking.HistorialCambiosJson = $"Vuelo reprogramado para el {offer.NuevaFechaSalida:dd/MM/yyyy}. Diferencia pagada: ${offer.TotalPagar:F2}";

            await _uow.CompleteAsync();

            var bookingService = new BookingService(_uow);
            return await bookingService.GetBookingDetailAsync(bookingId);
        }

        public async Task<CancellationQuoteResponse> GetCancellationQuoteAsync(string bookingId)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var booking = await _uow.Reservas.GetByIdAsync(id);
            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            if (booking.Estado == "CANCELLED")
                throw new AerocacheProblemException(409, "ALREADY_CANCELLED", "La reserva ya se encuentra cancelada");

            bool isTopFare = booking.MarcaTarifa == "Top";
            decimal refund = isTopFare ? Math.Round(booking.MontoTotalGeneral * 0.90m, 2) : Math.Round(booking.MontoTotalGeneral * 0.50m, 2);
            decimal penalty = booking.MontoTotalGeneral - refund;

            var quote = new CotizacionCancelacion
            {
                CotizacionId = "QTE-" + Guid.NewGuid().ToString("N")[..8].ToUpper(),
                ReservaId = booking.ReservaId,
                EsReembolsable = true,
                MontoReembolso = refund,
                MontoPenalidad = penalty,
                Moneda = "USD",
                FechaExpiracion = DateTime.UtcNow.AddMinutes(30)
            };

            await _uow.CotizacionesCancelacion.AddAsync(quote);
            await _uow.CompleteAsync();

            return new CancellationQuoteResponse
            {
                QuoteId = quote.CotizacionId,
                IsRefundable = quote.EsReembolsable,
                RefundAmount = refund.ToString("F2", CultureInfo.InvariantCulture),
                PenaltyAmount = penalty.ToString("F2", CultureInfo.InvariantCulture),
                Currency = "USD",
                ExpiresAt = quote.FechaExpiracion.ToString("o")
            };
        }

        public async Task CancelBookingAsync(string bookingId, CancelBookingRequest request, string? idempotencyKey)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var booking = await _uow.Reservas.Query()
                .Include(b => b.Boletos)
                .FirstOrDefaultAsync(b => b.ReservaId == id);

            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            if (booking.Estado == "CANCELLED")
                throw new AerocacheProblemException(409, "ALREADY_CANCELLED", "La reserva ya ha sido cancelada");

            var quote = await _uow.CotizacionesCancelacion.FirstOrDefaultAsync(q => q.CotizacionId == request.QuoteId);
            if (quote == null || quote.FechaExpiracion < DateTime.UtcNow)
            {
                throw new AerocacheProblemException(410, "QUOTE_EXPIRED", "La cotización de cancelación ha expirado");
            }

            booking.Estado = "CANCELLED";
            booking.MotivoCancelacion = request.Reason ?? "Cancelado por solicitud del pasajero";
            booking.FechaActualizacion = DateTime.UtcNow;

            foreach (var t in booking.Boletos)
            {
                t.Estado = "REFUNDED";
            }

            await _uow.CompleteAsync();
        }

        public async Task<ChangeSeatResponse> ChangeSeatAsync(string bookingId, ChangeSeatRequest request)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var booking = await _uow.Reservas.Query()
                .Include(b => b.Pasajeros)
                .Include(b => b.PasesAbordar)
                .FirstOrDefaultAsync(b => b.ReservaId == id);

            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            if (booking.Estado == "CANCELLED")
                throw new AerocacheProblemException(409, "CANNOT_CHANGE_SEAT", "No se puede cambiar asiento en una reserva cancelada");

            var newSeat = request.NewSeatNumber?.Trim().ToUpperInvariant();
            if (string.IsNullOrEmpty(newSeat))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "Debe especificar el nuevo asiento");

            // Check if the seat is already occupied by another booking on this flight
            bool isTaken = await _uow.Reservas.Query()
                .Where(b => b.VueloId == booking.VueloId && b.ReservaId != booking.ReservaId && (b.Estado == "CONFIRMED" || b.Estado == "CHECKED_IN"))
                .AnyAsync(b => b.Pasajeros.Any(p => p.NumeroAsientoAsignado == newSeat));

            if (isTaken)
            {
                throw new AerocacheProblemException(409, "SEAT_NOT_AVAILABLE", "Asiento ocupado", $"El asiento {newSeat} ya se encuentra ocupado por otro pasajero.");
            }

            // Find passenger
            var passenger = string.IsNullOrEmpty(request.PassengerId)
                ? booking.Pasajeros.FirstOrDefault()
                : booking.Pasajeros.FirstOrDefault(p => p.Id == request.PassengerId);

            if (passenger == null)
                throw new AerocacheProblemException(404, "PASSENGER_NOT_FOUND", "Pasajero no encontrado en la reserva");

            passenger.NumeroAsientoAsignado = newSeat;

            // If boarding pass already issued, update seat on boarding pass too
            var bp = booking.PasesAbordar.FirstOrDefault(b => b.PasajeroId == passenger.Id);
            if (bp != null)
            {
                bp.Asiento = newSeat;
            }

            booking.FechaActualizacion = DateTime.UtcNow;
            await _uow.CompleteAsync();

            return new ChangeSeatResponse
            {
                BookingId = booking.ReservaId.ToString(),
                PassengerId = passenger.Id,
                SeatNumber = newSeat,
                Message = $"Asiento actualizado exitosamente a {newSeat}"
            };
        }
    }
}

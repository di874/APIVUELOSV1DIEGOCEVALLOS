using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Aerocache.Business.Interfaces;
using Aerocache.DataAccess.Entities;
using Aerocache.DataManagement.Interfaces;

namespace Aerocache.Business.Services
{
    public class PostSaleSoapService : IPostSaleSoapService
    {
        private readonly IUnitOfWork _uow;
        private readonly IEventBus _eventBus;
        private readonly ILogger<PostSaleSoapService> _logger;

        public PostSaleSoapService(
            IUnitOfWork uow,
            IEventBus eventBus,
            ILogger<PostSaleSoapService> logger)
        {
            _uow = uow;
            _eventBus = eventBus;
            _logger = logger;
        }

        public async Task<QuoteCancellationSoapResponse> QuoteCancellationAsync(QuoteCancellationSoapRequest request)
        {
            var pnr = request.Pnr?.Trim().ToUpperInvariant() ?? "";
            _logger.LogInformation("🧼 [SOAP PostSale] Cotizando cancelación para PNR: '{Pnr}'", pnr);

            var booking = await _uow.Reservas.Query()
                .FirstOrDefaultAsync(b => b.Pnr == pnr);

            if (booking == null)
            {
                return new QuoteCancellationSoapResponse
                {
                    Success = false,
                    Pnr = pnr,
                    Message = $"No se encontró ninguna reserva activa con el PNR '{pnr}'."
                };
            }

            if (booking.Estado == "CANCELLED")
            {
                return new QuoteCancellationSoapResponse
                {
                    Success = false,
                    Pnr = pnr,
                    Message = $"La reserva {pnr} ya se encuentra cancelada."
                };
            }

            bool isTop = string.Equals(booking.MarcaTarifa, "Top", StringComparison.OrdinalIgnoreCase);
            bool isPlus = string.Equals(booking.MarcaTarifa, "Plus", StringComparison.OrdinalIgnoreCase);

            decimal refundRate = isTop ? 0.90m : (isPlus ? 0.50m : 0.00m);
            decimal refund = Math.Round(booking.MontoTotalGeneral * refundRate, 2);
            decimal penalty = booking.MontoTotalGeneral - refund;

            var quote = new CotizacionCancelacion
            {
                CotizacionId = "SOAP-QTE-" + Guid.NewGuid().ToString("N")[..8].ToUpper(),
                ReservaId = booking.ReservaId,
                EsReembolsable = refund > 0,
                MontoReembolso = refund,
                MontoPenalidad = penalty,
                Moneda = booking.Moneda ?? "USD",
                FechaExpiracion = DateTime.UtcNow.AddMinutes(30)
            };

            await _uow.CotizacionesCancelacion.AddAsync(quote);
            await _uow.CompleteAsync();

            return new QuoteCancellationSoapResponse
            {
                Success = true,
                QuoteId = quote.CotizacionId,
                Pnr = pnr,
                IsRefundable = quote.EsReembolsable,
                RefundAmount = quote.MontoReembolso,
                PenaltyAmount = quote.MontoPenalidad,
                Currency = quote.Moneda,
                ExpiresAt = quote.FechaExpiracion,
                Message = quote.EsReembolsable
                    ? $"Cotización generada con éxito. Reembolso estimado: ${refund:F2} USD (Penalidad: ${penalty:F2} USD)."
                    : "Tarifa no reembolsable según condiciones contractuales de tarifa Light."
            };
        }

        public async Task<CancelBookingSoapResponse> CancelBookingAsync(CancelBookingSoapRequest request)
        {
            var pnr = request.Pnr?.Trim().ToUpperInvariant() ?? "";
            _logger.LogInformation("🧼 [SOAP PostSale] Procesando cancelación formal para PNR: '{Pnr}'", pnr);

            var booking = await _uow.Reservas.Query()
                .Include(b => b.Pasajeros)
                .Include(b => b.Boletos)
                .FirstOrDefaultAsync(b => b.Pnr == pnr);

            if (booking == null)
            {
                return new CancelBookingSoapResponse { Success = false, Pnr = pnr, Message = "Reserva no encontrada." };
            }

            if (booking.Estado == "CANCELLED")
            {
                return new CancelBookingSoapResponse { Success = false, Pnr = pnr, Message = "La reserva ya ha sido cancelada previamente." };
            }

            var quote = await _uow.CotizacionesCancelacion
                .FirstOrDefaultAsync(q => q.CotizacionId == request.QuoteId && q.ReservaId == booking.ReservaId);

            decimal refundApplied = quote != null && quote.FechaExpiracion >= DateTime.UtcNow ? quote.MontoReembolso : 0m;

            booking.Estado = "CANCELLED";
            booking.MotivoCancelacion = request.Reason ?? "Cancelación solicitada mediante servicio SOAP PostSale";
            booking.FechaActualizacion = DateTime.UtcNow;

            foreach (var boleto in booking.Boletos)
            {
                boleto.Estado = "REFUNDED";
            }

            // Liberar asientos asignados
            var flightSeats = await _uow.Asientos.Query()
                .Where(s => s.VueloId == booking.VueloId && !s.EstaDisponible)
                .ToListAsync();

            var assignedSeatNumbers = booking.Pasajeros
                .Select(p => p.NumeroAsientoAsignado)
                .Where(s => !string.IsNullOrEmpty(s))
                .ToList();

            foreach (var seat in flightSeats.Where(s => assignedSeatNumbers.Contains(s.NumeroAsiento)))
            {
                seat.EstaDisponible = true;
            }

            await _uow.CompleteAsync();

            // Emitir evento al Bus RabbitMQ
            await _eventBus.PublishAsync("booking.cancelled", new
            {
                pnr = booking.Pnr,
                bookingId = booking.ReservaId,
                status = "CANCELLED",
                refundAmount = refundApplied,
                reason = booking.MotivoCancelacion,
                cancelledAt = DateTime.UtcNow
            });

            return new CancelBookingSoapResponse
            {
                Success = true,
                Pnr = pnr,
                Status = "CANCELLED",
                RefundedAmount = refundApplied,
                Message = $"La reserva {pnr} ha sido cancelada exitosamente y los asientos han sido liberados. Reembolso procesado: ${refundApplied:F2} USD."
            };
        }

        public async Task<QuoteRescheduleSoapResponse> QuoteRescheduleAsync(QuoteRescheduleSoapRequest request)
        {
            var pnr = request.Pnr?.Trim().ToUpperInvariant() ?? "";
            _logger.LogInformation("🧼 [SOAP PostSale] Cotizando cambio de fecha para PNR: '{Pnr}'", pnr);

            var booking = await _uow.Reservas.Query().FirstOrDefaultAsync(b => b.Pnr == pnr);
            if (booking == null)
            {
                return new QuoteRescheduleSoapResponse { Success = false, Pnr = pnr, Message = "Reserva no encontrada." };
            }

            if (booking.Estado == "CANCELLED")
            {
                return new QuoteRescheduleSoapResponse { Success = false, Pnr = pnr, Message = "No es posible reprogramar una reserva cancelada." };
            }

            DateTime newDate = DateTime.TryParse(request.NewDepartureDate, out var d) ? d : DateTime.UtcNow.AddDays(7);
            decimal fareDiff = 10.00m;
            decimal changeFee = string.Equals(booking.MarcaTarifa, "Top", StringComparison.OrdinalIgnoreCase) ? 0.00m : 15.00m;
            decimal totalToPay = fareDiff + changeFee;

            var offer = new OfertaCambioFecha
            {
                OfertaCambioId = "SOAP-CHG-" + Guid.NewGuid().ToString("N")[..8].ToUpper(),
                ReservaId = booking.ReservaId,
                NuevaFechaSalida = newDate,
                DiferenciaTarifa = fareDiff,
                DiferenciaImpuesto = 1.50m,
                CargoCambio = changeFee,
                TotalPagar = totalToPay,
                FechaExpiracion = DateTime.UtcNow.AddMinutes(30)
            };

            await _uow.OfertasCambioFecha.AddAsync(offer);
            await _uow.CompleteAsync();

            return new QuoteRescheduleSoapResponse
            {
                Success = true,
                ChangeOfferId = offer.OfertaCambioId,
                Pnr = pnr,
                TargetFlightNumber = string.IsNullOrWhiteSpace(request.TargetFlightNumber) ? "AC1403" : request.TargetFlightNumber,
                FareDifference = offer.DiferenciaTarifa,
                ChangeFee = offer.CargoCambio,
                TotalToPay = offer.TotalPagar,
                Currency = "USD",
                ExpiresAt = offer.FechaExpiracion,
                Message = $"Cotización de cambio de fecha generada con éxito. Monto total a pagar: ${totalToPay:F2} USD."
            };
        }

        public async Task<RescheduleBookingSoapResponse> RescheduleBookingAsync(RescheduleBookingSoapRequest request)
        {
            var pnr = request.Pnr?.Trim().ToUpperInvariant() ?? "";
            _logger.LogInformation("🧼 [SOAP PostSale] Confirmando cambio de fecha para PNR: '{Pnr}'", pnr);

            var booking = await _uow.Reservas.Query()
                .Include(b => b.Pasajeros)
                .FirstOrDefaultAsync(b => b.Pnr == pnr);

            if (booking == null)
            {
                return new RescheduleBookingSoapResponse { Success = false, Pnr = pnr, Message = "Reserva no encontrada." };
            }

            var offer = await _uow.OfertasCambioFecha
                .FirstOrDefaultAsync(o => o.OfertaCambioId == request.ChangeOfferId && o.ReservaId == booking.ReservaId);

            if (offer == null || offer.FechaExpiracion < DateTime.UtcNow)
            {
                return new RescheduleBookingSoapResponse { Success = false, Pnr = pnr, Message = "La oferta de cambio de fecha no existe o ha expirado." };
            }

            booking.FechaSalida = offer.NuevaFechaSalida;
            booking.MontoTotalGeneral += offer.TotalPagar;
            booking.FechaActualizacion = DateTime.UtcNow;
            booking.HistorialCambiosJson = $"Reprogramado vía SOAP al vuelo {request.TargetFlightNumber} el {offer.NuevaFechaSalida:dd/MM/yyyy HH:mm}. Cargo: ${offer.TotalPagar:F2}";

            if (!string.IsNullOrWhiteSpace(request.NewSeatNumber) && booking.Pasajeros.Any())
            {
                booking.Pasajeros.First().NumeroAsientoAsignado = request.NewSeatNumber.Trim().ToUpperInvariant();
            }

            await _uow.CompleteAsync();

            // Emitir evento RabbitMQ
            await _eventBus.PublishAsync("booking.rescheduled", new
            {
                pnr = booking.Pnr,
                bookingId = booking.ReservaId,
                newFlight = request.TargetFlightNumber,
                newDate = offer.NuevaFechaSalida,
                additionalPaid = offer.TotalPagar,
                newSeat = booking.Pasajeros.FirstOrDefault()?.NumeroAsientoAsignado
            });

            return new RescheduleBookingSoapResponse
            {
                Success = true,
                Pnr = pnr,
                NewFlightNumber = request.TargetFlightNumber,
                NewDepartureDate = offer.NuevaFechaSalida.ToString("yyyy-MM-dd HH:mm"),
                NewSeatNumber = booking.Pasajeros.FirstOrDefault()?.NumeroAsientoAsignado ?? "N/A",
                Message = $"¡Vuelo reprogramado exitosamente! Nueva fecha de salida: {offer.NuevaFechaSalida:dd/MM/yyyy HH:mm}."
            };
        }

        public async Task<AddBaggageSoapResponse> AddBaggageAsync(AddBaggageSoapRequest request)
        {
            var pnr = request.Pnr?.Trim().ToUpperInvariant() ?? "";
            _logger.LogInformation("🧼 [SOAP PostSale] Añadiendo equipaje para PNR: '{Pnr}'", pnr);

            var booking = await _uow.Reservas.Query()
                .Include(b => b.Pasajeros)
                .FirstOrDefaultAsync(b => b.Pnr == pnr);

            if (booking == null)
            {
                return new AddBaggageSoapResponse { Success = false, Pnr = pnr, Message = "Reserva no encontrada." };
            }

            if (booking.Estado == "CANCELLED")
            {
                return new AddBaggageSoapResponse { Success = false, Pnr = pnr, Message = "No es posible agregar equipaje a una reserva cancelada." };
            }

            var passenger = string.IsNullOrWhiteSpace(request.PassengerDocument)
                ? booking.Pasajeros.FirstOrDefault()
                : booking.Pasajeros.FirstOrDefault(p => p.NumeroDocumento == request.PassengerDocument.Trim());

            if (passenger == null)
            {
                return new AddBaggageSoapResponse { Success = false, Pnr = pnr, Message = "Pasajero no encontrado en la reserva." };
            }

            int qty = Math.Max(1, request.Quantity);
            if (passenger.CantidadEquipajeExtra + qty > 4)
            {
                return new AddBaggageSoapResponse
                {
                    Success = false,
                    Pnr = pnr,
                    Message = $"Límite excedido. El pasajero ya tiene {passenger.CantidadEquipajeExtra} maletas adicionales (máximo permitido: 4)."
                };
            }

            decimal pricePerBag = 20.00m;
            decimal totalCost = pricePerBag * qty;

            passenger.CantidadEquipajeExtra += qty;
            booking.MontoTotalGeneral += totalCost;
            booking.FechaActualizacion = DateTime.UtcNow;

            await _uow.CompleteAsync();

            // Emitir evento RabbitMQ
            await _eventBus.PublishAsync("booking.baggage_added", new
            {
                pnr = booking.Pnr,
                bookingId = booking.ReservaId,
                passengerId = passenger.Id,
                passengerName = $"{passenger.Nombre} {passenger.Apellido}",
                addedBags = qty,
                totalBags = passenger.CantidadEquipajeExtra,
                amountCharged = totalCost
            });

            return new AddBaggageSoapResponse
            {
                Success = true,
                Pnr = pnr,
                PassengerName = $"{passenger.Nombre} {passenger.Apellido}",
                TotalBaggage = passenger.CantidadEquipajeExtra,
                AmountCharged = totalCost,
                Currency = "USD",
                Message = $"Se añadieron exitosamente {qty} maleta(s) adicional(es) a {passenger.Nombre} {passenger.Apellido}. Total acumulado: {passenger.CantidadEquipajeExtra} maleta(s)."
            };
        }

        public async Task<PostSaleSummarySoapResponse> GetPostSaleSummaryAsync(PostSaleSummarySoapRequest request)
        {
            var pnr = request.Pnr?.Trim().ToUpperInvariant() ?? "";
            _logger.LogInformation("🧼 [SOAP PostSale] Consultando resumen para PNR: '{Pnr}'", pnr);

            var booking = await _uow.Reservas.Query()
                .Include(b => b.Pasajeros)
                .FirstOrDefaultAsync(b => b.Pnr == pnr);

            if (booking == null)
            {
                return new PostSaleSummarySoapResponse { Success = false, Pnr = pnr, Message = "Reserva no encontrada." };
            }

            var flight = await _uow.Vuelos.GetByIdAsync(booking.VueloId ?? "");

            bool canCancel = booking.Estado != "CANCELLED";
            bool canReschedule = booking.Estado != "CANCELLED";
            bool canAddBaggage = booking.Estado != "CANCELLED";

            return new PostSaleSummarySoapResponse
            {
                Success = true,
                Pnr = pnr,
                Status = booking.Estado ?? "CONFIRMED",
                FlightNumber = flight?.NumeroVuelo ?? "AC1401",
                Route = $"{booking.OrigenIata} ➔ {booking.DestinoIata}",
                DepartureDate = (booking.FechaSalida != default ? booking.FechaSalida : (flight?.SalidaProgramada ?? DateTime.UtcNow)).ToString("yyyy-MM-dd HH:mm"),
                TotalAmount = booking.MontoTotalGeneral,
                Currency = booking.Moneda ?? "USD",
                FareBrand = booking.MarcaTarifa ?? "Top",
                PassengersCount = booking.Pasajeros.Count,
                TotalBaggageCount = booking.Pasajeros.Sum(p => p.CantidadEquipajeExtra),
                CanCancel = canCancel,
                CanReschedule = canReschedule,
                CanAddBaggage = canAddBaggage,
                ChangeHistory = booking.HistorialCambiosJson ?? "Sin modificaciones previas",
                Message = $"Reserva {pnr} en estado {booking.Estado}."
            };
        }
    }
}

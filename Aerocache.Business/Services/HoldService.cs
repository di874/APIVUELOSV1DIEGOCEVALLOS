using System;
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
    public class HoldService : IHoldService
    {
        private readonly IUnitOfWork _uow;

        public HoldService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<HoldResponse> CreateHoldAsync(HoldRequest request, string? idempotencyKey)
        {
            if (string.IsNullOrWhiteSpace(request.OfferId))
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "OfferId es obligatorio");
            }

            var cleanOfferId = request.OfferId.StartsWith("OFF-") ? request.OfferId.Substring(4).Trim() : request.OfferId.Trim();
            var flightIds = cleanOfferId.Split('_', StringSplitOptions.RemoveEmptyEntries);
            var primaryFlightId = flightIds[0];
            var secondaryFlightId = flightIds.Length > 1 ? flightIds[1] : null;

            var primaryFlight = await _uow.Vuelos.Query()
                .Include(f => f.TarifasCabina)
                .FirstOrDefaultAsync(f => f.Id == primaryFlightId);

            if (primaryFlight == null)
            {
                throw new AerocacheProblemException(404, "OFFER_NO_LONGER_AVAILABLE", "Oferta no encontrada o expirada");
            }

            Vuelo? secondaryFlight = null;
            if (!string.IsNullOrEmpty(secondaryFlightId))
            {
                secondaryFlight = await _uow.Vuelos.Query()
                    .Include(f => f.TarifasCabina)
                    .FirstOrDefaultAsync(f => f.Id == secondaryFlightId);
            }

            int totalPassengers = (request.PassengersBreakdown?.Adults ?? 1)
                                + (request.PassengersBreakdown?.Youths ?? 0)
                                + (request.PassengersBreakdown?.Children ?? 0);
            if (totalPassengers <= 0) totalPassengers = 1;

            var sel1 = request.ItinerarySelections?.FirstOrDefault();
            var cabinClass1 = sel1?.CabinClass ?? "ECONOMY";
            var fareBrand1 = sel1?.FareBrand ?? "Light";

            var fare1 = primaryFlight.TarifasCabina.FirstOrDefault(c => c.ClaseCabina == cabinClass1 && c.MarcaTarifa == fareBrand1)
                       ?? primaryFlight.TarifasCabina.FirstOrDefault()
                       ?? new TarifaCabina { TarifaBase = 49.00m, Impuestos = 7.35m, PrecioTotal = 56.35m };

            decimal baseLocked = fare1.TarifaBase * totalPassengers;
            decimal taxesLocked = fare1.Impuestos * totalPassengers;
            decimal totalLocked = fare1.PrecioTotal * totalPassengers;

            if (secondaryFlight != null)
            {
                var sel2 = request.ItinerarySelections?.Skip(1).FirstOrDefault() ?? sel1;
                var cabinClass2 = sel2?.CabinClass ?? "ECONOMY";
                var fareBrand2 = sel2?.FareBrand ?? "Light";

                var fare2 = secondaryFlight.TarifasCabina.FirstOrDefault(c => c.ClaseCabina == cabinClass2 && c.MarcaTarifa == fareBrand2)
                           ?? secondaryFlight.TarifasCabina.FirstOrDefault()
                           ?? new TarifaCabina { TarifaBase = 49.00m, Impuestos = 7.35m, PrecioTotal = 56.35m };

                baseLocked += fare2.TarifaBase * totalPassengers;
                taxesLocked += fare2.Impuestos * totalPassengers;
                totalLocked += fare2.PrecioTotal * totalPassengers;
            }

            int ttl = request.TtlMinutes > 0 ? request.TtlMinutes : 15;

            var hold = new BloqueoTemporal
            {
                BloqueoId = Guid.NewGuid(),
                OfertaId = request.OfferId,
                VueloId = cleanOfferId,
                ItinerarioId = sel1?.ItineraryId ?? $"ITIN-{primaryFlight.Id}",
                ClaseCabina = cabinClass1,
                MarcaTarifa = fareBrand1,
                TarifaBaseBloqueada = baseLocked,
                ImpuestosBloqueados = taxesLocked,
                TotalBloqueado = totalLocked,
                Moneda = "USD",
                Estado = "HELD",
                FechaCreacion = DateTime.UtcNow,
                FechaExpiracion = DateTime.UtcNow.AddMinutes(ttl),
                TiempoVidaMinutos = ttl,
                Adultos = request.PassengersBreakdown?.Adults ?? 1,
                Jovenes = request.PassengersBreakdown?.Youths ?? 0,
                Ninos = request.PassengersBreakdown?.Children ?? 0,
                Bebes = request.PassengersBreakdown?.Infants ?? 0
            };

            await _uow.BloqueosTemporales.AddAsync(hold);
            await _uow.CompleteAsync();

            return new HoldResponse
            {
                HoldId = hold.BloqueoId.ToString(),
                Status = "HELD",
                ExpiresAt = hold.FechaExpiracion.ToString("o"),
                TtlMinutes = hold.TiempoVidaMinutos,
                LockedPrice = new MoneyAmount
                {
                    Currency = "USD",
                    BaseFare = baseLocked.ToString("F2", CultureInfo.InvariantCulture),
                    Taxes = taxesLocked.ToString("F2", CultureInfo.InvariantCulture),
                    Total = totalLocked.ToString("F2", CultureInfo.InvariantCulture)
                }
            };
        }

        public async Task<HoldStatusResponse> GetHoldStatusAsync(string holdId)
        {
            if (!Guid.TryParse(holdId, out var parsedHoldId))
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "HoldId inválido");
            }

            var hold = await _uow.BloqueosTemporales.GetByIdAsync(parsedHoldId);
            if (hold == null)
            {
                throw new AerocacheProblemException(404, "OFFER_NO_LONGER_AVAILABLE", "Hold no encontrado");
            }

            var expiryUtc = hold.FechaExpiracion.Kind == DateTimeKind.Utc 
                ? hold.FechaExpiracion 
                : (hold.FechaExpiracion.Kind == DateTimeKind.Local 
                    ? hold.FechaExpiracion.ToUniversalTime() 
                    : DateTime.SpecifyKind(hold.FechaExpiracion, DateTimeKind.Utc));

            int remainingSeconds = (int)(expiryUtc - DateTime.UtcNow).TotalSeconds;
            if (remainingSeconds <= 0 && hold.Estado == "HELD")
            {
                hold.Estado = "EXPIRED";
                remainingSeconds = 0;
                await _uow.CompleteAsync();
            }

            return new HoldStatusResponse
            {
                Status = hold.Estado,
                ExpiresAt = hold.FechaExpiracion.ToString("o"),
                RemainingSeconds = Math.Max(0, remainingSeconds),
                LockedPrice = new MoneyAmount
                {
                    Currency = hold.Moneda,
                    BaseFare = hold.TarifaBaseBloqueada.ToString("F2", CultureInfo.InvariantCulture),
                    Taxes = hold.ImpuestosBloqueados.ToString("F2", CultureInfo.InvariantCulture),
                    Total = hold.TotalBloqueado.ToString("F2", CultureInfo.InvariantCulture)
                }
            };
        }

        public async Task ReleaseHoldAsync(string holdId)
        {
            if (!Guid.TryParse(holdId, out var parsedHoldId))
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "HoldId inválido");
            }

            var hold = await _uow.BloqueosTemporales.GetByIdAsync(parsedHoldId);
            if (hold == null)
            {
                throw new AerocacheProblemException(404, "OFFER_NO_LONGER_AVAILABLE", "Hold no encontrado");
            }

            hold.Estado = "RELEASED";
            await _uow.CompleteAsync();
        }
    }
}

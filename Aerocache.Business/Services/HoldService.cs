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

            var flightId = request.OfferId.Replace("OFF-", "").Trim();
            var flight = await _uow.Vuelos.Query()
                .Include(f => f.TarifasCabina)
                .FirstOrDefaultAsync(f => f.Id == flightId);

            if (flight == null)
            {
                throw new AerocacheProblemException(404, "OFFER_NO_LONGER_AVAILABLE", "Oferta no encontrada o expirada");
            }

            var selection = request.ItinerarySelections?.FirstOrDefault();
            var cabinClass = selection?.CabinClass ?? "ECONOMY";
            var fareBrand = selection?.FareBrand ?? "Light";

            var fare = flight.TarifasCabina.FirstOrDefault(c => c.ClaseCabina == cabinClass && c.MarcaTarifa == fareBrand)
                       ?? flight.TarifasCabina.FirstOrDefault()
                       ?? new TarifaCabina { TarifaBase = 49.00m, Impuestos = 7.35m, PrecioTotal = 56.35m };

            int totalPassengers = (request.PassengersBreakdown?.Adults ?? 1)
                                + (request.PassengersBreakdown?.Youths ?? 0)
                                + (request.PassengersBreakdown?.Children ?? 0);
            if (totalPassengers <= 0) totalPassengers = 1;

            decimal totalLocked = fare.PrecioTotal * totalPassengers;
            decimal baseLocked = fare.TarifaBase * totalPassengers;
            decimal taxesLocked = fare.Impuestos * totalPassengers;

            var hold = new BloqueoTemporal
            {
                BloqueoId = Guid.NewGuid(),
                OfertaId = request.OfferId,
                VueloId = flight.Id,
                ItinerarioId = selection?.ItineraryId ?? $"ITIN-{flight.Id}",
                ClaseCabina = cabinClass,
                MarcaTarifa = fareBrand,
                TarifaBaseBloqueada = baseLocked,
                ImpuestosBloqueados = taxesLocked,
                TotalBloqueado = totalLocked,
                Moneda = "USD",
                Estado = "HELD",
                FechaCreacion = DateTime.UtcNow,
                FechaExpiracion = DateTime.UtcNow.AddMinutes(15),
                TiempoVidaMinutos = 15,
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

            int remainingSeconds = (int)(hold.FechaExpiracion - DateTime.UtcNow).TotalSeconds;
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

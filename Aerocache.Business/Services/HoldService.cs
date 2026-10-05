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
            var flight = await _uow.Flights.Query()
                .Include(f => f.CabinFares)
                .FirstOrDefaultAsync(f => f.Id == flightId);

            if (flight == null)
            {
                throw new AerocacheProblemException(404, "OFFER_NO_LONGER_AVAILABLE", "Oferta no encontrada o expirada");
            }

            var selection = request.ItinerarySelections?.FirstOrDefault();
            var cabinClass = selection?.CabinClass ?? "ECONOMY";
            var fareBrand = selection?.FareBrand ?? "Light";

            var fare = flight.CabinFares.FirstOrDefault(c => c.CabinClass == cabinClass && c.FareBrand == fareBrand)
                       ?? flight.CabinFares.FirstOrDefault()
                       ?? new CabinFare { BaseFare = 49.00m, Taxes = 7.35m, TotalPrice = 56.35m };

            int totalPassengers = (request.PassengersBreakdown?.Adults ?? 1)
                                + (request.PassengersBreakdown?.Youths ?? 0)
                                + (request.PassengersBreakdown?.Children ?? 0);
            if (totalPassengers <= 0) totalPassengers = 1;

            decimal totalLocked = fare.TotalPrice * totalPassengers;
            decimal baseLocked = fare.BaseFare * totalPassengers;
            decimal taxesLocked = fare.Taxes * totalPassengers;

            var hold = new HoldRecord
            {
                HoldId = Guid.NewGuid(),
                OfferId = request.OfferId,
                FlightId = flight.Id,
                ItineraryId = selection?.ItineraryId ?? $"ITIN-{flight.Id}",
                CabinClass = cabinClass,
                FareBrand = fareBrand,
                LockedBaseFare = baseLocked,
                LockedTaxes = taxesLocked,
                LockedTotal = totalLocked,
                Currency = "USD",
                Status = "HELD",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                TtlMinutes = 15,
                Adults = request.PassengersBreakdown?.Adults ?? 1,
                Youths = request.PassengersBreakdown?.Youths ?? 0,
                Children = request.PassengersBreakdown?.Children ?? 0,
                Infants = request.PassengersBreakdown?.Infants ?? 0
            };

            await _uow.Holds.AddAsync(hold);
            await _uow.CompleteAsync();

            return new HoldResponse
            {
                HoldId = hold.HoldId.ToString(),
                Status = "HELD",
                ExpiresAt = hold.ExpiresAt.ToString("o"),
                TtlMinutes = hold.TtlMinutes,
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

            var hold = await _uow.Holds.GetByIdAsync(parsedHoldId);
            if (hold == null)
            {
                throw new AerocacheProblemException(404, "OFFER_NO_LONGER_AVAILABLE", "Hold no encontrado");
            }

            int remainingSeconds = (int)(hold.ExpiresAt - DateTime.UtcNow).TotalSeconds;
            if (remainingSeconds <= 0 && hold.Status == "HELD")
            {
                hold.Status = "EXPIRED";
                remainingSeconds = 0;
                await _uow.CompleteAsync();
            }

            return new HoldStatusResponse
            {
                Status = hold.Status,
                ExpiresAt = hold.ExpiresAt.ToString("o"),
                RemainingSeconds = Math.Max(0, remainingSeconds),
                LockedPrice = new MoneyAmount
                {
                    Currency = hold.Currency,
                    BaseFare = hold.LockedBaseFare.ToString("F2", CultureInfo.InvariantCulture),
                    Taxes = hold.LockedTaxes.ToString("F2", CultureInfo.InvariantCulture),
                    Total = hold.LockedTotal.ToString("F2", CultureInfo.InvariantCulture)
                }
            };
        }

        public async Task ReleaseHoldAsync(string holdId)
        {
            if (!Guid.TryParse(holdId, out var parsedHoldId))
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "HoldId inválido");
            }

            var hold = await _uow.Holds.GetByIdAsync(parsedHoldId);
            if (hold == null)
            {
                throw new AerocacheProblemException(404, "OFFER_NO_LONGER_AVAILABLE", "Hold no encontrado");
            }

            hold.Status = "RELEASED";
            await _uow.CompleteAsync();
        }
    }
}

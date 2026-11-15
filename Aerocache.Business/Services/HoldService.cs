using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Aerocache.Business.DTOs;
using Aerocache.Business.Exceptions;
using Aerocache.Business.Helpers;
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

        private static bool IsValidAircraftSeat(string seat)
        {
            if (string.IsNullOrWhiteSpace(seat) || seat.Length < 2 || seat.Length > 3)
                return false;

            char col = char.ToUpperInvariant(seat[^1]);
            if (col < 'A' || col > 'F')
                return false;

            var rowStr = seat[..^1];
            if (!int.TryParse(rowStr, NumberStyles.None, CultureInfo.InvariantCulture, out int row))
                return false;

            return row >= 1 && row <= 24;
        }

        public async Task<(HoldResponse Response, bool IsReplay)> CreateHoldAsync(HoldRequest request, string? idempotencyKey, string? correlationId = null, string? userId = null)
        {
            if (string.IsNullOrWhiteSpace(request.OfferId))
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "OfferId es obligatorio");
            }

            var cleanOfferId = request.OfferId.StartsWith("OFF-") ? request.OfferId.Substring(4).Trim() : request.OfferId.Trim();
            var flightIds = cleanOfferId.Split('_', StringSplitOptions.RemoveEmptyEntries);
            var primaryFlightId = flightIds[0];
            var secondaryFlightId = flightIds.Length > 1 ? flightIds[1] : null;

            // Validar assignedSeats si se proporcionaron
            var requestedSeats = request.AssignedSeats?
                .Where(s => !string.IsNullOrWhiteSpace(s.SeatNumber))
                .Select(s => s.SeatNumber.Trim().ToUpperInvariant())
                .Distinct()
                .ToList() ?? new List<string>();

            // Validar que cada asiento exista en el mapa de la aeronave (Airbus A320: filas 1-24, columnas A-F)
            foreach (var seat in requestedSeats)
            {
                if (!IsValidAircraftSeat(seat))
                {
                    throw new AerocacheProblemException(400, "VALIDATION_FAILED", "Asiento inexistente",
                        $"El asiento {seat} no existe en la configuración de la aeronave (filas 1 a 24, columnas A a F).");
                }
            }

            // 1. Verificar idempotencia por Idempotency-Key
            if (!string.IsNullOrWhiteSpace(idempotencyKey))
            {
                var existingIdemp = await _uow.RegistrosIdempotencia.GetByIdAsync(idempotencyKey);
                if (existingIdemp != null && !string.IsNullOrWhiteSpace(existingIdemp.CuerpoRespuesta))
                {
                    try
                    {
                        var cached = JsonSerializer.Deserialize<HoldResponse>(existingIdemp.CuerpoRespuesta);
                        if (cached != null && Guid.TryParse(cached.HoldId, out var hId))
                        {
                            var hEntity = await _uow.BloqueosTemporales.GetByIdAsync(hId);
                            if (hEntity != null && hEntity.Estado == "HELD" && hEntity.FechaExpiracion > DateTime.UtcNow)
                            {
                                return (cached, true);
                            }
                        }
                    }
                    catch { }
                }
            }

            // 2. Verificar idempotencia por X-Correlation-Id
            if (!string.IsNullOrWhiteSpace(correlationId))
            {
                var corrKey = "CORR_HOLD_" + correlationId;
                var existingCorr = await _uow.RegistrosIdempotencia.GetByIdAsync(corrKey);
                if (existingCorr != null && !string.IsNullOrWhiteSpace(existingCorr.CuerpoRespuesta))
                {
                    try
                    {
                        var cached = JsonSerializer.Deserialize<HoldResponse>(existingCorr.CuerpoRespuesta);
                        if (cached != null && Guid.TryParse(cached.HoldId, out var hId))
                        {
                            var hEntity = await _uow.BloqueosTemporales.GetByIdAsync(hId);
                            if (hEntity != null && hEntity.Estado == "HELD" && hEntity.FechaExpiracion > DateTime.UtcNow)
                            {
                                return (cached, true);
                            }
                        }
                    }
                    catch { }
                }
            }

            // 3. Verificar idempotencia por X-User-Id
            var sortedSeatsStr = string.Join(",", requestedSeats.OrderBy(s => s));
            if (!string.IsNullOrWhiteSpace(userId) && requestedSeats.Any())
            {
                var userKey = $"HOLD_USER_{userId}_{cleanOfferId}_{sortedSeatsStr}";
                var existingUser = await _uow.RegistrosIdempotencia.GetByIdAsync(userKey);
                if (existingUser != null && !string.IsNullOrWhiteSpace(existingUser.CuerpoRespuesta))
                {
                    try
                    {
                        var cached = JsonSerializer.Deserialize<HoldResponse>(existingUser.CuerpoRespuesta);
                        if (cached != null && Guid.TryParse(cached.HoldId, out var hId))
                        {
                            var hEntity = await _uow.BloqueosTemporales.GetByIdAsync(hId);
                            if (hEntity != null && hEntity.Estado == "HELD" && hEntity.FechaExpiracion > DateTime.UtcNow)
                            {
                                return (cached, true);
                            }
                        }
                    }
                    catch { }
                }
            }

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

            if (requestedSeats.Any())
            {
                // 1. Validar contra reservas existentes no canceladas
                var bookedSeats = await _uow.Reservas.Query()
                    .Where(b => (b.VueloId == primaryFlight.Id || b.VueloId == cleanOfferId) && b.Estado != "CANCELLED")
                    .SelectMany(b => b.Pasajeros.Select(p => p.NumeroAsientoAsignado))
                    .Where(s => !string.IsNullOrEmpty(s))
                    .ToListAsync();

                var bookedSeatSet = new HashSet<string>(bookedSeats.Where(s => !string.IsNullOrEmpty(s))!, StringComparer.OrdinalIgnoreCase);
                foreach (var seat in requestedSeats)
                {
                    if (bookedSeatSet.Contains(seat))
                    {
                        throw new AerocacheProblemException(409, "SEAT_TAKEN", "Asiento no disponible", $"El asiento {seat} ya se encuentra reservado.");
                    }
                }

                // 2. Validar contra holds activos vigentes
                var nowUtc = DateTime.UtcNow;
                var activeHolds = await _uow.BloqueosTemporales.Query()
                    .Where(h => (h.VueloId == primaryFlight.Id || h.VueloId == cleanOfferId || h.OfertaId == request.OfferId) 
                                && h.Estado == "HELD" 
                                && h.FechaExpiracion > nowUtc)
                    .ToListAsync();

                var heldSeatSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var ah in activeHolds)
                {
                    if (!string.IsNullOrWhiteSpace(ah.AsientosAsignados))
                    {
                        foreach (var hs in ah.AsientosAsignados.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                        {
                            heldSeatSet.Add(hs.ToUpperInvariant());
                        }
                    }
                }

                foreach (var seat in requestedSeats)
                {
                    if (heldSeatSet.Contains(seat))
                    {
                        throw new AerocacheProblemException(409, "SEAT_TAKEN", "Asiento no disponible", $"El asiento {seat} ya se encuentra bloqueado por otro hold activo.");
                    }
                }
            }

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
                Bebes = request.PassengersBreakdown?.Infants ?? 0,
                AsientosAsignados = requestedSeats.Any() ? string.Join(",", requestedSeats) : null
            };

            await _uow.BloqueosTemporales.AddAsync(hold);

            var holdResponse = new HoldResponse
            {
                HoldId = hold.BloqueoId.ToString(),
                Status = "HELD",
                ExpiresAt = EcuadorTimeHelper.FormatInstantIso(hold.FechaExpiracion),
                TtlMinutes = hold.TiempoVidaMinutos,
                LockedPrice = new MoneyAmount
                {
                    Currency = "USD",
                    BaseFare = baseLocked.ToString("F2", CultureInfo.InvariantCulture),
                    Taxes = taxesLocked.ToString("F2", CultureInfo.InvariantCulture),
                    Total = totalLocked.ToString("F2", CultureInfo.InvariantCulture)
                }
            };

            var responseJson = JsonSerializer.Serialize(holdResponse);

            if (!string.IsNullOrWhiteSpace(idempotencyKey))
            {
                var existingIdemp = await _uow.RegistrosIdempotencia.GetByIdAsync(idempotencyKey);
                if (existingIdemp != null)
                {
                    existingIdemp.CuerpoRespuesta = responseJson;
                    existingIdemp.CodigoEstado = 201;
                    existingIdemp.FechaCreacion = DateTime.UtcNow;
                }
                else
                {
                    await _uow.RegistrosIdempotencia.AddAsync(new RegistroIdempotencia
                    {
                        Clave = idempotencyKey,
                        CodigoEstado = 201,
                        CuerpoRespuesta = responseJson,
                        FechaCreacion = DateTime.UtcNow
                    });
                }
            }

            if (!string.IsNullOrWhiteSpace(correlationId))
            {
                var corrKey = "CORR_HOLD_" + correlationId;
                var existingCorr = await _uow.RegistrosIdempotencia.GetByIdAsync(corrKey);
                if (existingCorr != null)
                {
                    existingCorr.CuerpoRespuesta = responseJson;
                    existingCorr.CodigoEstado = 201;
                    existingCorr.FechaCreacion = DateTime.UtcNow;
                }
                else
                {
                    await _uow.RegistrosIdempotencia.AddAsync(new RegistroIdempotencia
                    {
                        Clave = corrKey,
                        CodigoEstado = 201,
                        CuerpoRespuesta = responseJson,
                        FechaCreacion = DateTime.UtcNow
                    });
                }
            }

            if (!string.IsNullOrWhiteSpace(userId) && requestedSeats.Any())
            {
                var userKey = $"HOLD_USER_{userId}_{cleanOfferId}_{sortedSeatsStr}";
                var existingUser = await _uow.RegistrosIdempotencia.GetByIdAsync(userKey);
                if (existingUser != null)
                {
                    existingUser.CuerpoRespuesta = responseJson;
                    existingUser.CodigoEstado = 201;
                    existingUser.FechaCreacion = DateTime.UtcNow;
                }
                else
                {
                    await _uow.RegistrosIdempotencia.AddAsync(new RegistroIdempotencia
                    {
                        Clave = userKey,
                        CodigoEstado = 201,
                        CuerpoRespuesta = responseJson,
                        FechaCreacion = DateTime.UtcNow
                    });
                }
            }

            await _uow.CompleteAsync();

            return (holdResponse, false);
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
                ExpiresAt = EcuadorTimeHelper.FormatInstantIso(hold.FechaExpiracion),
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
                // Idempotente segun contrato OpenAPI: liberar hold inexistente o ya liberado responde 204
                return;
            }

            if (hold.Estado == "CONSUMED")
            {
                throw new AerocacheProblemException(409, "HOLD_ALREADY_CONSUMED", "Hold ya consumido", "Un hold CONSUMED ya convertido en reserva no puede liberarse.");
            }

            if (hold.Estado == "RELEASED")
            {
                return;
            }

            hold.Estado = "RELEASED";
            await _uow.CompleteAsync();
        }
    }
}

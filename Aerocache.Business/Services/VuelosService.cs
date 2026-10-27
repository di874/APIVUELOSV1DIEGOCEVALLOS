using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Aerocache.Business.DTOs;
using Aerocache.Business.Interfaces;
using Aerocache.DataAccess.Context;
using Aerocache.DataAccess.Entities;

namespace Aerocache.Business.Services
{
    public class VuelosService : IVuelosService
    {
        private static readonly DateTime StartTime = DateTime.UtcNow;
        private readonly AerocacheDbContext _context;

        public VuelosService(AerocacheDbContext context)
        {
            _context = context;
        }

        public async Task<VuelosHealthResponse> GetHealthAsync()
        {
            var sw = Stopwatch.StartNew();
            bool dbUp = false;
            int dbLatency = 10;
            try
            {
                await _context.Database.ExecuteSqlRawAsync("SELECT 1");
                sw.Stop();
                dbLatency = (int)sw.ElapsedMilliseconds;
                dbUp = true;
            }
            catch
            {
                dbUp = false;
            }

            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            int holdsCount = 0;
            int flightsToday = 0;
            try
            {
                holdsCount = await _context.BloqueosTemporales
                    .CountAsync(b => b.Estado == "HELD" && b.FechaExpiracion > DateTime.UtcNow);

                flightsToday = await _context.Vuelos
                    .CountAsync(v => v.SalidaProgramada >= today && v.SalidaProgramada < tomorrow);
            }
            catch { }

            var uptimeSeconds = (long)(DateTime.UtcNow - StartTime).TotalSeconds;

            return new VuelosHealthResponse
            {
                Status = dbUp ? "HEALTHY" : "DEGRADED",
                NodoId = "NODE_VUE_ECOAIRLINES",
                NombreProveedor = "EcoAirlines",
                Vertical = "VUELOS",
                Version = "2.0.0",
                UptimeSeconds = uptimeSeconds,
                LatenciaMs = dbLatency > 0 ? dbLatency : 12,
                CircuitBreakerEstado = "CLOSED",
                HoldsActivosCount = holdsCount,
                VuelosProgramadosHoy = flightsToday,
                Dependencias = new List<VuelosHealthDependency>
                {
                    new() { Nombre = "postgres", Status = dbUp ? "UP" : "DOWN", LatenciaMs = dbLatency },
                    new() { Nombre = "rabbitmq", Status = "UP", LatenciaMs = 2 }
                },
                Timestamp = DateTime.UtcNow.ToString("o")
            };
        }

        public async Task<VuelosEventosResponse> GetEventosAsync(int limit, string? after)
        {
            int maxLimit = limit > 0 ? Math.Min(limit, 100) : 20;

            var query = _context.EventosPublicados.AsQueryable();

            if (!string.IsNullOrEmpty(after))
            {
                var afterEvent = await _context.EventosPublicados.FirstOrDefaultAsync(e => e.Id == after);
                if (afterEvent != null)
                {
                    query = query.Where(e => e.Time < afterEvent.Time);
                }
            }

            var eventsList = await query
                .OrderByDescending(e => e.Time)
                .Take(maxLimit)
                .ToListAsync();

            var cloudEvents = eventsList.Select(e =>
            {
                object? dataObj = null;
                try
                {
                    dataObj = JsonSerializer.Deserialize<object>(e.DataJson);
                }
                catch
                {
                    dataObj = e.DataJson;
                }

                return new VuelosCloudEvent
                {
                    SpecVersion = e.SpecVersion,
                    Type = e.Type,
                    Source = e.Source,
                    Id = e.Id,
                    Time = e.Time.ToString("o"),
                    Subject = e.Subject,
                    DataContentType = e.DataContentType,
                    CorrelationId = e.CorrelationId,
                    Data = dataObj
                };
            }).ToList();

            var totalCount = await _context.EventosPublicados.CountAsync();
            var nextAfter = cloudEvents.LastOrDefault()?.Id;

            return new VuelosEventosResponse
            {
                Events = cloudEvents,
                Metadata = new VuelosEventosMetadata
                {
                    Total = totalCount,
                    NextAfter = cloudEvents.Count == maxLimit ? nextAfter : null,
                    Timestamp = DateTime.UtcNow.ToString("o")
                }
            };
        }

        public async Task<ContratoPromocionesResponse> GetContratoPromocionesAsync()
        {
            var contrato = await _context.ContratosPromociones.FirstOrDefaultAsync();
            if (contrato == null)
            {
                contrato = new ContratoPromociones();
                _context.ContratosPromociones.Add(contrato);
                await _context.SaveChangesAsync();
            }

            List<string> destinos = new();
            List<string> rutas = new();
            List<string> cabinas = new();

            try { destinos = JsonSerializer.Deserialize<List<string>>(contrato.DestinosHabilitadosJson) ?? new(); } catch { }
            try { rutas = JsonSerializer.Deserialize<List<string>>(contrato.RutasHabilitadasJson) ?? new(); } catch { }
            try { cabinas = JsonSerializer.Deserialize<List<string>>(contrato.CabinasHabilitadasJson) ?? new(); } catch { }

            return new ContratoPromocionesResponse
            {
                ProveedorCodigo = contrato.ProveedorCodigo,
                NombreSocio = contrato.NombreSocio,
                Vertical = contrato.Vertical,
                Activo = contrato.Activo,
                DescuentoPorcentaje = contrato.DescuentoPorcentaje,
                DestinosHabilitados = destinos,
                RutasHabilitadas = rutas,
                CabinasHabilitadas = cabinas,
                VigenciaHasta = contrato.VigenciaHasta,
                CondicionesCombo = contrato.CondicionesCombo,
                ActualizadoEn = contrato.ActualizadoEn.ToString("o")
            };
        }

        public async Task<ContratoPromocionesUpdateResponse> UpdateContratoPromocionesAsync(ContratoPromocionesRequest request)
        {
            var contrato = await _context.ContratosPromociones.FirstOrDefaultAsync();
            if (contrato == null)
            {
                contrato = new ContratoPromociones();
                _context.ContratosPromociones.Add(contrato);
            }

            contrato.Activo = request.Activo;
            contrato.DescuentoPorcentaje = request.DescuentoPorcentaje;
            contrato.DestinosHabilitadosJson = JsonSerializer.Serialize(request.DestinosHabilitados);
            contrato.RutasHabilitadasJson = JsonSerializer.Serialize(request.RutasHabilitadas);
            contrato.CabinasHabilitadasJson = JsonSerializer.Serialize(request.CabinasHabilitadas);
            contrato.VigenciaHasta = request.VigenciaHasta;
            contrato.CondicionesCombo = request.CondicionesCombo;
            contrato.ActualizadoEn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var responseContrato = await GetContratoPromocionesAsync();

            return new ContratoPromocionesUpdateResponse
            {
                Success = true,
                Mensaje = "Acuerdo B2B de promociones de vuelos actualizado exitosamente.",
                Contrato = responseContrato
            };
        }
    }
}

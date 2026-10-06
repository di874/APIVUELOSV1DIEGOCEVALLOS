using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Aerocache.Business.DTOs;
using Aerocache.Business.Exceptions;
using Aerocache.Business.Interfaces;
using Aerocache.DataManagement.Interfaces;

namespace Aerocache.Business.Services
{
    public class FlightStatusService : IFlightStatusService
    {
        private readonly IUnitOfWork _uow;

        public FlightStatusService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<FlightStatusDto> GetFlightStatusAsync(string flightNumber, string date)
        {
            var flight = await _uow.Vuelos.Query()
                .FirstOrDefaultAsync(f => f.NumeroVuelo == flightNumber);

            if (flight == null)
            {
                throw new AerocacheProblemException(404, "FLIGHT_STATUS_NOT_AVAILABLE", $"Estado de vuelo no disponible para {flightNumber}");
            }

            DateTime queryDate;
            if (!DateTime.TryParse(date, out queryDate))
                queryDate = DateTime.UtcNow.Date;

            return new FlightStatusDto
            {
                FlightNumber = flight.NumeroVuelo,
                Date = queryDate.ToString("yyyy-MM-dd"),
                MarketingCarrier = flight.AerolineaComercial,
                OperatingCarrier = flight.AerolineaOperadora,
                Aircraft = flight.Aeronave,
                Status = flight.Estado,
                Departure = new FlightStatusEndpoint
                {
                    IataCode = flight.OrigenIata,
                    Terminal = flight.TerminalSalida,
                    ScheduledAt = flight.SalidaProgramada.ToString("o"),
                    EstimatedAt = flight.SalidaEstimada?.ToString("o"),
                    ActualAt = flight.SalidaReal?.ToString("o")
                },
                Arrival = new FlightStatusEndpoint
                {
                    IataCode = flight.DestinoIata,
                    Terminal = flight.TerminalLlegada,
                    ScheduledAt = flight.LlegadaProgramada.ToString("o"),
                    EstimatedAt = flight.LlegadaEstimada?.ToString("o"),
                    ActualAt = flight.LlegadaReal?.ToString("o")
                }
            };
        }
    }
}

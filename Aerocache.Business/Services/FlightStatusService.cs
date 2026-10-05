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
            var flight = await _uow.Flights.Query()
                .FirstOrDefaultAsync(f => f.FlightNumber == flightNumber);

            if (flight == null)
            {
                throw new AerocacheProblemException(404, "FLIGHT_STATUS_NOT_AVAILABLE", $"Estado de vuelo no disponible para {flightNumber}");
            }

            DateTime queryDate;
            if (!DateTime.TryParse(date, out queryDate))
                queryDate = DateTime.UtcNow.Date;

            return new FlightStatusDto
            {
                FlightNumber = flight.FlightNumber,
                Date = queryDate.ToString("yyyy-MM-dd"),
                MarketingCarrier = flight.MarketingCarrier,
                OperatingCarrier = flight.OperatingCarrier,
                Aircraft = flight.Aircraft,
                Status = flight.Status,
                Departure = new FlightStatusEndpoint
                {
                    IataCode = flight.OriginIata,
                    Terminal = flight.TerminalDeparture,
                    ScheduledAt = flight.ScheduledDeparture.ToString("o"),
                    EstimatedAt = flight.EstimatedDeparture?.ToString("o"),
                    ActualAt = flight.ActualDeparture?.ToString("o")
                },
                Arrival = new FlightStatusEndpoint
                {
                    IataCode = flight.DestinationIata,
                    Terminal = flight.TerminalArrival,
                    ScheduledAt = flight.ScheduledArrival.ToString("o"),
                    EstimatedAt = flight.EstimatedArrival?.ToString("o"),
                    ActualAt = flight.ActualArrival?.ToString("o")
                }
            };
        }
    }
}

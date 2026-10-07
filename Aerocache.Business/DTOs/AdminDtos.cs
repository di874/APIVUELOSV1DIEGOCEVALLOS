using System;
using System.Collections.Generic;

namespace Aerocache.Business.DTOs
{
    public class AdminLoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class AdminLoginResponse
    {
        public bool Success { get; set; }
        public string Token { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = "ADMIN";
    }

    public class RouteStatDto
    {
        public string Route { get; set; } = string.Empty; // e.g. "UIO - GYE"
        public int FlightsCount { get; set; }
        public int BookingsCount { get; set; }
        public decimal TotalRevenue { get; set; }
    }

    public class FlightOccupancyDto
    {
        public string FlightId { get; set; } = string.Empty;
        public string FlightNumber { get; set; } = string.Empty;
        public string Route { get; set; } = string.Empty;
        public string ScheduledDeparture { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int TotalSeats { get; set; } = 150;
        public int BookedSeats { get; set; }
        public int AvailableSeats { get; set; }
        public double OccupancyPercentage { get; set; }
    }

    public class AdminDashboardStatsDto
    {
        public int TotalBookings { get; set; }
        public int ConfirmedBookings { get; set; }
        public int CancelledBookings { get; set; }
        public int TotalPassengers { get; set; }
        public decimal TotalRevenue { get; set; }
        public int TotalFlightsToday { get; set; }
        public List<RouteStatDto> RouteStats { get; set; } = new();
        public List<FlightOccupancyDto> FlightOccupancies { get; set; } = new();
        public List<BookingDetail> RecentBookings { get; set; } = new();
    }

    public class UpdateFlightStatusRequest
    {
        public string Status { get; set; } = "SCHEDULED"; // SCHEDULED, BOARDING, DEPARTED, DELAYED, ARRIVED, CANCELLED
    }

    public class CreateFlightRequest
    {
        public string? FlightNumber { get; set; } // e.g. "AC1601"
        public string OriginIata { get; set; } = string.Empty; // e.g. "UIO"
        public string DestinationIata { get; set; } = string.Empty; // e.g. "GPS"
        public string? OriginCity { get; set; } // e.g. "Quito"
        public string? DestinationCity { get; set; } // e.g. "Galápagos (Baltra)"
        public string? DepartureTime { get; set; } // ISO date string or HH:mm
        public string? ArrivalTime { get; set; }
        public int DurationMinutes { get; set; } = 50;
        public string Aircraft { get; set; } = "Airbus A320";
        public decimal BasePrice { get; set; } = 49.00m;
    }

    public class DestinationDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Airport { get; set; } = string.Empty;
    }

    public class RouteItemDto
    {
        public string RouteKey { get; set; } = string.Empty; // e.g. "UIO-GYE"
        public string OriginIata { get; set; } = string.Empty;
        public string OriginCity { get; set; } = string.Empty;
        public string DestinationIata { get; set; } = string.Empty;
        public string DestinationCity { get; set; } = string.Empty;
        public string AirportName { get; set; } = string.Empty;
        public int DurationMinutes { get; set; }
        public decimal BasePrice { get; set; }
        public decimal PriceLight { get; set; }
        public decimal PricePlus { get; set; }
        public decimal PriceTop { get; set; }
        public int FlightsCount { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class CreateRouteRequest
    {
        public string OriginIata { get; set; } = string.Empty;
        public string? OriginCity { get; set; }
        public string DestinationIata { get; set; } = string.Empty;
        public string? DestinationCity { get; set; }
        public string? AirportName { get; set; }
        public int DurationMinutes { get; set; } = 50;
        public decimal BasePrice { get; set; } = 49.00m;
        public decimal? PriceLight { get; set; }
        public decimal? PricePlus { get; set; }
        public decimal? PriceTop { get; set; }
        public string? InitialFlightNumber { get; set; }
    }

    public class UpdateRouteRequest
    {
        public string? DestinationCity { get; set; }
        public string? AirportName { get; set; }
        public int DurationMinutes { get; set; }
        public decimal BasePrice { get; set; }
        public decimal? PriceLight { get; set; }
        public decimal? PricePlus { get; set; }
        public decimal? PriceTop { get; set; }
    }
}

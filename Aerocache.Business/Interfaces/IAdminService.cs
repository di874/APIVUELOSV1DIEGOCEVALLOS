using System.Collections.Generic;
using System.Threading.Tasks;
using Aerocache.Business.DTOs;

namespace Aerocache.Business.Interfaces
{
    public interface IAdminService
    {
        Task<AdminLoginResponse> LoginAsync(AdminLoginRequest request);
        Task<AdminDashboardStatsDto> GetDashboardStatsAsync();
        Task<FlightStatusDto> UpdateFlightStatusAsync(string flightNumber, UpdateFlightStatusRequest request);
        Task<List<PassengerItem>> GetFlightPassengersAsync(string flightNumber);
        Task<FlightOccupancyDto> CreateFlightAsync(CreateFlightRequest request);
        Task<List<DestinationDto>> GetDestinationsAsync();
        Task<List<RouteItemDto>> GetRoutesAsync();
        Task<RouteItemDto> CreateRouteAsync(CreateRouteRequest request);
        Task<RouteItemDto> UpdateRouteAsync(string routeKey, UpdateRouteRequest request);
        Task<bool> DeleteRouteAsync(string routeKey);
    }
}

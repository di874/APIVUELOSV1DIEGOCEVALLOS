using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Aerocache.Business.DTOs;
using Aerocache.Business.Interfaces;

namespace Aerocache.API.Controllers
{
    [ApiController]
    [Route("admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        /// <summary>
        /// Iniciar sesión como administrador de AEROCACHE
        /// </summary>
        [HttpPost("login")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(AdminLoginResponse), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 401)]
        public async Task<IActionResult> Login([FromBody] AdminLoginRequest request)
        {
            var result = await _adminService.LoginAsync(request);
            return Ok(result);
        }

        /// <summary>
        /// Obtener métricas e indicadores de operaciones de vuelos y reservas
        /// </summary>
        [HttpGet("dashboard-stats")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(AdminDashboardStatsDto), 200)]
        public async Task<IActionResult> GetDashboardStats()
        {
            var result = await _adminService.GetDashboardStatsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Cambiar estado operativo de un vuelo (SCHEDULED, BOARDING, DEPARTED, DELAYED, ARRIVED)
        /// </summary>
        [HttpPut("flights/{flightNumber}/status")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(FlightStatusDto), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 404)]
        public async Task<IActionResult> UpdateFlightStatus([FromRoute] string flightNumber, [FromBody] UpdateFlightStatusRequest request)
        {
            var result = await _adminService.UpdateFlightStatusAsync(flightNumber, request);
            return Ok(result);
        }

        /// <summary>
        /// Listar todos los pasajeros registrados en un vuelo
        /// </summary>
        [HttpGet("flights/{flightNumber}/passengers")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(System.Collections.Generic.List<PassengerItem>), 200)]
        public async Task<IActionResult> GetFlightPassengers([FromRoute] string flightNumber)
        {
            var result = await _adminService.GetFlightPassengersAsync(flightNumber);
            return Ok(result);
        }

        /// <summary>
        /// Crear un nuevo vuelo y registrar nuevas rutas / destinos
        /// </summary>
        [HttpPost("flights")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(FlightOccupancyDto), 201)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 400)]
        public async Task<IActionResult> CreateFlight([FromBody] CreateFlightRequest request)
        {
            var result = await _adminService.CreateFlightAsync(request);
            return StatusCode(201, result);
        }

        /// <summary>
        /// Obtener lista de todos los destinos y aeropuertos disponibles
        /// </summary>
        [HttpGet("destinations")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(System.Collections.Generic.List<DestinationDto>), 200)]
        public async Task<IActionResult> GetDestinations()
        {
            var result = await _adminService.GetDestinationsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Listar todas las rutas activas de Ecuador con precios y frecuencias
        /// </summary>
        [HttpGet("routes")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(System.Collections.Generic.List<RouteItemDto>), 200)]
        public async Task<IActionResult> GetRoutes()
        {
            var result = await _adminService.GetRoutesAsync();
            return Ok(result);
        }

        /// <summary>
        /// Crear una nueva ruta / destino en Ecuador con tarifas personalizadas
        /// </summary>
        [HttpPost("routes")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(RouteItemDto), 201)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 400)]
        public async Task<IActionResult> CreateRoute([FromBody] CreateRouteRequest request)
        {
            var result = await _adminService.CreateRouteAsync(request);
            return StatusCode(201, result);
        }

        /// <summary>
        /// Actualizar datos y precios de una ruta existente
        /// </summary>
        [HttpPut("routes/{routeKey}")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(RouteItemDto), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 404)]
        public async Task<IActionResult> UpdateRoute([FromRoute] string routeKey, [FromBody] UpdateRouteRequest request)
        {
            var result = await _adminService.UpdateRouteAsync(routeKey, request);
            return Ok(result);
        }

        /// <summary>
        /// Eliminar una ruta de vuelo y sus itinerarios asociados
        /// </summary>
        [HttpDelete("routes/{routeKey}")]
        [ProducesResponseType(204)]
        public async Task<IActionResult> DeleteRoute([FromRoute] string routeKey)
        {
            await _adminService.DeleteRouteAsync(routeKey);
            return NoContent();
        }
    }
}

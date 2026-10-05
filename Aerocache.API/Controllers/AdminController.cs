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
    }
}

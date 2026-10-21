using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Aerocache.Business.DTOs;
using Aerocache.Business.Interfaces;

namespace Aerocache.API.Controllers
{
    [ApiController]
    [Route("auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        /// <summary>
        /// Iniciar sesión (para Clientes y Administradores)
        /// </summary>
        [HttpPost("login")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(AuthResponseDto), 200)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 400)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 401)]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            var result = await _authService.LoginAsync(request);
            return Ok(result);
        }

        /// <summary>
        /// Registrar nuevo cliente / pasajero
        /// </summary>
        [HttpPost("register")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(AuthResponseDto), 201)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 400)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 409)]
        public async Task<IActionResult> Register([FromBody] RegisterClientRequestDto request)
        {
            var result = await _authService.RegisterClientAsync(request);
            return StatusCode(201, result);
        }

        /// <summary>
        /// Crear un nuevo administrador (Exclusivo para la gestión de administradores)
        /// </summary>
        [HttpPost("admin/create")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(AuthResponseDto), 201)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 400)]
        [ProducesResponseType(typeof(ProblemDetailsDto), 409)]
        public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminRequestDto request)
        {
            var result = await _authService.CreateAdminAsync(request);
            return StatusCode(201, result);
        }

        /// <summary>
        /// Listar todos los administradores registrados
        /// </summary>
        [HttpGet("admin/list")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(List<UserDto>), 200)]
        public async Task<IActionResult> GetAdmins()
        {
            var result = await _authService.GetAdminsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Listar todos los clientes registrados
        /// </summary>
        [HttpGet("clients/list")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(List<UserDto>), 200)]
        public async Task<IActionResult> GetClients()
        {
            var result = await _authService.GetClientsAsync();
            return Ok(result);
        }
    }
}

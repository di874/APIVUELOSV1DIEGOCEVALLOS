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

        /// <summary>
        /// Endpoint OAuth 2.0 Token (Client Credentials flow según OpenAPI v2)
        /// Soporta form-urlencoded, JSON, Basic Auth y query parameters.
        /// </summary>
        [HttpPost("/oauth2/token")]
        [HttpPost("/api/v2/oauth2/token")]
        [HttpPost("/auth/token")]
        [HttpPost("/vuelos/oauth2/token")]
        [Produces("application/json")]
        public async Task<IActionResult> GetOAuth2Token()
        {
            string? grantType = null;
            string? clientId = null;
            string? clientSecret = null;
            string? scope = null;

            // 1. Basic Auth header
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Basic ", System.StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var raw = authHeader.Substring("Basic ".Length).Trim();
                    var decoded = System.Text.Encoding.UTF8.GetString(System.Convert.FromBase64String(raw));
                    var parts = decoded.Split(':', 2);
                    if (parts.Length == 2)
                    {
                        clientId = parts[0];
                        clientSecret = parts[1];
                    }
                }
                catch { }
            }

            // 2. Form URL Encoded
            if (Request.HasFormContentType)
            {
                var form = await Request.ReadFormAsync();
                grantType ??= form["grant_type"].ToString();
                clientId ??= form["client_id"].ToString();
                clientSecret ??= form["client_secret"].ToString();
                scope ??= form["scope"].ToString();
            }
            // 3. JSON Body
            else if (Request.ContentType != null && Request.ContentType.Contains("json", System.StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    using var reader = new System.IO.StreamReader(Request.Body);
                    var body = await reader.ReadToEndAsync();
                    if (!string.IsNullOrWhiteSpace(body))
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(body);
                        var root = doc.RootElement;
                        if (root.TryGetProperty("grant_type", out var gt)) grantType ??= gt.GetString();
                        if (root.TryGetProperty("client_id", out var cid)) clientId ??= cid.GetString();
                        if (root.TryGetProperty("client_secret", out var cs)) clientSecret ??= cs.GetString();
                        if (root.TryGetProperty("scope", out var sc)) scope ??= sc.GetString();
                    }
                }
                catch { }
            }

            // 4. Query string fallback
            grantType = string.IsNullOrWhiteSpace(grantType) ? Request.Query["grant_type"].ToString() : grantType;
            clientId = string.IsNullOrWhiteSpace(clientId) ? Request.Query["client_id"].ToString() : clientId;
            clientSecret = string.IsNullOrWhiteSpace(clientSecret) ? Request.Query["client_secret"].ToString() : clientSecret;
            scope = string.IsNullOrWhiteSpace(scope) ? Request.Query["scope"].ToString() : scope;

            // Default grant_type
            grantType = string.IsNullOrWhiteSpace(grantType) ? "client_credentials" : grantType.Trim();

            // Default client_id if omitted during testing
            if (string.IsNullOrWhiteSpace(clientId))
            {
                clientId = "NODE_VUE_EQ10";
            }

            var effectiveScope = string.IsNullOrWhiteSpace(scope)
                ? "flights:read flights:hold flights:book flights:cancel flights:webhooks flights:ops flights:admin"
                : scope;

            var accessToken = $"AEROCACHE-VUELOS-EQ10-{System.Guid.NewGuid():N}";

            return Ok(new
            {
                access_token = accessToken,
                token_type = "Bearer",
                expires_in = 3600,
                scope = effectiveScope
            });
        }
    }
}

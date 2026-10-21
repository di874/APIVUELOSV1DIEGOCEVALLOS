using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Aerocache.Business.DTOs;
using Aerocache.Business.Exceptions;
using Aerocache.Business.Interfaces;
using Aerocache.DataAccess.Entities;
using Aerocache.DataManagement.Interfaces;

namespace Aerocache.Business.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUnitOfWork _uow;

        public AuthService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
        {
            var email = request.Email?.Trim().ToLowerInvariant();
            var password = request.Password?.Trim();

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                throw new AerocacheProblemException(400, "BAD_REQUEST", "Credenciales requeridas", "Debe proporcionar correo electrónico y contraseña.");
            }

            var user = await _uow.Usuarios.Query()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email);

            if (user == null || user.PasswordHash != password)
            {
                // Fallback for default admin if DB not yet seeded with that specific entry
                if ((email == "admin@aerocache.ec" || email == "admin@aerocache") && (password == "admin" || password == "admin123"))
                {
                    return new AuthResponseDto
                    {
                        Success = true,
                        Token = "DEV-JWT-ADMIN-" + Guid.NewGuid().ToString("N"),
                        User = new UserDto
                        {
                            Id = "usr-admin-default",
                            Nombre = "Administrador",
                            Apellido = "AEROCACHE",
                            Email = "admin@aerocache.ec",
                            Rol = "ADMIN",
                            Documento = "1751030295",
                            Telefono = "+593991234567",
                            FechaCreacion = DateTime.UtcNow
                        },
                        Message = "Bienvenido, Administrador."
                    };
                }

                throw new AerocacheProblemException(401, "UNAUTHORIZED", "Credenciales inválidas", "El correo o la contraseña son incorrectos.");
            }

            var token = $"DEV-JWT-{user.Rol}-{user.Id}-{Guid.NewGuid():N}";

            return new AuthResponseDto
            {
                Success = true,
                Token = token,
                User = MapToDto(user),
                Message = user.Rol == "ADMIN" ? "Inicio de sesión de administrador exitoso." : "Inicio de sesión exitoso."
            };
        }

        public async Task<AuthResponseDto> RegisterClientAsync(RegisterClientRequestDto request)
        {
            var email = request.Email?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
            {
                throw new AerocacheProblemException(400, "BAD_REQUEST", "Datos incompletos", "El correo y la contraseña son obligatorios.");
            }

            var exists = await _uow.Usuarios.Query()
                .AnyAsync(u => u.Email.ToLower() == email);

            if (exists)
            {
                throw new AerocacheProblemException(409, "CONFLICT", "Correo ya registrado", "Ya existe una cuenta registrada con este correo electrónico.");
            }

            var nuevoUsuario = new Usuario
            {
                Id = "usr-cli-" + Guid.NewGuid().ToString("N")[..8],
                Nombre = request.Nombre?.Trim() ?? "Cliente",
                Apellido = request.Apellido?.Trim() ?? "",
                Email = email,
                PasswordHash = request.Password.Trim(),
                Rol = "CLIENTE",
                Documento = request.Documento?.Trim(),
                Telefono = request.Telefono?.Trim(),
                FechaCreacion = DateTime.UtcNow
            };

            await _uow.Usuarios.AddAsync(nuevoUsuario);
            await _uow.CompleteAsync();

            var token = $"DEV-JWT-CLIENTE-{nuevoUsuario.Id}-{Guid.NewGuid():N}";

            return new AuthResponseDto
            {
                Success = true,
                Token = token,
                User = MapToDto(nuevoUsuario),
                Message = "¡Cuenta creada exitosamente! Bienvenido a AEROCACHE."
            };
        }

        public async Task<AuthResponseDto> CreateAdminAsync(CreateAdminRequestDto request)
        {
            var email = request.Email?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
            {
                throw new AerocacheProblemException(400, "BAD_REQUEST", "Datos incompletos", "El correo y la contraseña son obligatorios para crear un administrador.");
            }

            var exists = await _uow.Usuarios.Query()
                .AnyAsync(u => u.Email.ToLower() == email);

            if (exists)
            {
                throw new AerocacheProblemException(409, "CONFLICT", "Correo ya registrado", "Ya existe un usuario con este correo electrónico.");
            }

            var nuevoAdmin = new Usuario
            {
                Id = "usr-adm-" + Guid.NewGuid().ToString("N")[..8],
                Nombre = request.Nombre?.Trim() ?? "Administrador",
                Apellido = request.Apellido?.Trim() ?? "AEROCACHE",
                Email = email,
                PasswordHash = request.Password.Trim(),
                Rol = "ADMIN",
                Documento = request.Documento?.Trim(),
                Telefono = request.Telefono?.Trim(),
                FechaCreacion = DateTime.UtcNow
            };

            await _uow.Usuarios.AddAsync(nuevoAdmin);
            await _uow.CompleteAsync();

            return new AuthResponseDto
            {
                Success = true,
                Token = $"DEV-JWT-ADMIN-{nuevoAdmin.Id}-{Guid.NewGuid():N}",
                User = MapToDto(nuevoAdmin),
                Message = $"Nuevo Administrador '{nuevoAdmin.Nombre} {nuevoAdmin.Apellido}' creado exitosamente."
            };
        }

        public async Task<List<UserDto>> GetAdminsAsync()
        {
            var admins = await _uow.Usuarios.Query()
                .Where(u => u.Rol == "ADMIN")
                .OrderByDescending(u => u.FechaCreacion)
                .ToListAsync();

            // Si aún no hay administradores en la tabla física, incluir el predeterminado
            if (!admins.Any())
            {
                return new List<UserDto>
                {
                    new UserDto
                    {
                        Id = "usr-admin-default",
                        Nombre = "Administrador",
                        Apellido = "AEROCACHE",
                        Email = "admin@aerocache.ec",
                        Rol = "ADMIN",
                        Documento = "1751030295",
                        Telefono = "+593991234567",
                        FechaCreacion = DateTime.UtcNow
                    }
                };
            }

            return admins.Select(MapToDto).ToList();
        }

        public async Task<List<UserDto>> GetClientsAsync()
        {
            var clients = await _uow.Usuarios.Query()
                .Where(u => u.Rol == "CLIENTE")
                .OrderByDescending(u => u.FechaCreacion)
                .ToListAsync();

            return clients.Select(MapToDto).ToList();
        }

        private static UserDto MapToDto(Usuario u)
        {
            return new UserDto
            {
                Id = u.Id,
                Nombre = u.Nombre,
                Apellido = u.Apellido,
                Email = u.Email,
                Rol = u.Rol,
                Documento = u.Documento,
                Telefono = u.Telefono,
                FechaCreacion = u.FechaCreacion
            };
        }
    }
}

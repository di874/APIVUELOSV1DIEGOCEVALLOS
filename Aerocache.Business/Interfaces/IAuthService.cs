using System.Collections.Generic;
using System.Threading.Tasks;
using Aerocache.Business.DTOs;

namespace Aerocache.Business.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto> LoginAsync(LoginRequestDto request);
        Task<AuthResponseDto> RegisterClientAsync(RegisterClientRequestDto request);
        Task<AuthResponseDto> CreateAdminAsync(CreateAdminRequestDto request);
        Task<List<UserDto>> GetAdminsAsync();
        Task<List<UserDto>> GetClientsAsync();
    }
}

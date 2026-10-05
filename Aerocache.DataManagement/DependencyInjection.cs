using Microsoft.Extensions.DependencyInjection;
using Aerocache.DataManagement.Interfaces;
using Aerocache.DataManagement.Repositories;

namespace Aerocache.DataManagement
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddDataManagement(this IServiceCollection services)
        {
            services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
            services.AddScoped<IUnitOfWork, UnitOfWork>();
            return services;
        }
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Aerocache.DataAccess.Context;

namespace Aerocache.DataAccess
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddDataAccess(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection") ?? "Data Source=aerocache.db";

            services.AddDbContext<AerocacheDbContext>(options =>
                options.UseSqlite(connectionString));

            return services;
        }
    }
}

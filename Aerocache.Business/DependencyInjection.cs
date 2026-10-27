using Microsoft.Extensions.DependencyInjection;
using Aerocache.Business.Interfaces;
using Aerocache.Business.Services;

namespace Aerocache.Business
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddBusiness(this IServiceCollection services)
        {
            services.AddScoped<IFlightSearchService, FlightSearchService>();
            services.AddScoped<IHoldService, HoldService>();
            services.AddScoped<IBookingService, BookingService>();
            services.AddScoped<IPostSaleService, PostSaleService>();
            services.AddScoped<ICheckInService, CheckInService>();
            services.AddScoped<IFlightStatusService, FlightStatusService>();
            services.AddScoped<IWebhookService, WebhookService>();
            services.AddScoped<IAdminService, AdminService>();
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IVuelosService, VuelosService>();

            // Event Bus RabbitMQ
            services.AddSingleton<IEventBus, RabbitMqEventBus>();

            // SOAP PostSale Service (MS.G.PostSale)
            services.AddScoped<IPostSaleSoapService, PostSaleSoapService>();

            return services;
        }
    }
}

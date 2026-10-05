using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Aerocache.Business.DTOs;
using Aerocache.Business.Exceptions;

namespace Aerocache.API.Middleware
{
    public class ProblemDetailsExceptionMiddleware
    {
        private readonly RequestDelegate _next;

        public ProblemDetailsExceptionMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (AerocacheProblemException ex)
            {
                await HandleProblemExceptionAsync(context, ex);
            }
            catch (Exception ex)
            {
                await HandleUnexpectedExceptionAsync(context, ex);
            }
        }

        private static async Task HandleProblemExceptionAsync(HttpContext context, AerocacheProblemException ex)
        {
            context.Response.ContentType = "application/problem+json";
            context.Response.StatusCode = ex.StatusCode;

            var problem = new ProblemDetailsDto
            {
                Type = $"https://httpstatuses.com/{ex.StatusCode}",
                Title = ex.Title,
                Status = ex.StatusCode,
                Detail = ex.Detail,
                Code = ex.Code,
                InvalidParams = ex.InvalidParams.Count > 0 ? ex.InvalidParams : null
            };

            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            await context.Response.WriteAsync(JsonSerializer.Serialize(problem, options));
        }

        private static async Task HandleUnexpectedExceptionAsync(HttpContext context, Exception ex)
        {
            context.Response.ContentType = "application/problem+json";
            context.Response.StatusCode = 500;

            var problem = new ProblemDetailsDto
            {
                Type = "https://httpstatuses.com/500",
                Title = "Error interno del servidor",
                Status = 500,
                Detail = ex.Message,
                Code = "INTERNAL_ERROR"
            };

            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            await context.Response.WriteAsync(JsonSerializer.Serialize(problem, options));
        }
    }
}

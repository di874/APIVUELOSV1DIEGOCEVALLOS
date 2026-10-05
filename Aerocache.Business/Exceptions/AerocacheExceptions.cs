using System;
using System.Collections.Generic;

namespace Aerocache.Business.Exceptions
{
    public class AerocacheProblemException : Exception
    {
        public int StatusCode { get; }
        public string Code { get; }
        public string Title { get; }
        public string? Detail { get; }
        public List<InvalidParamDto> InvalidParams { get; } = new();

        public AerocacheProblemException(int statusCode, string code, string title, string? detail = null, List<InvalidParamDto>? invalidParams = null)
            : base(detail ?? title)
        {
            StatusCode = statusCode;
            Code = code;
            Title = title;
            Detail = detail;
            if (invalidParams != null)
            {
                InvalidParams.AddRange(invalidParams);
            }
        }
    }

    public class InvalidParamDto
    {
        public string? Name { get; set; }
        public string? Reason { get; set; }
    }
}

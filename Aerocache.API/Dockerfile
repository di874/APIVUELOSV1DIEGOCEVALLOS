FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY Aerocache.sln ./
COPY Aerocache.API/Aerocache.API.csproj Aerocache.API/
COPY Aerocache.Business/Aerocache.Business.csproj Aerocache.Business/
COPY Aerocache.DataAccess/Aerocache.DataAccess.csproj Aerocache.DataAccess/
COPY Aerocache.DataManagement/Aerocache.DataManagement.csproj Aerocache.DataManagement/

RUN dotnet restore Aerocache.sln

COPY . .
WORKDIR /src/Aerocache.API
RUN dotnet publish Aerocache.API.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5200
ENV ASPNETCORE_ENVIRONMENT=Development
EXPOSE 5200

ENTRYPOINT ["dotnet", "Aerocache.API.dll"]

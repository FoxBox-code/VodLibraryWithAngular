using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using VodLibraryWithAngular.Server;
using VodLibraryWithAngular.Server.Data;

var builder = WebApplication.CreateBuilder(args);
Xabe.FFmpeg.FFmpeg.SetExecutablesPath(@"C:\stuff\ffmpeg-2025-01-22-git-e20ee9f9ae-full_build\bin");


// Add services to the container.
string connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("The default connection was not found!");
builder.Services.AddSingleton<WebRootConfiguration>();
builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddLogging();

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 104857600; //100MB
});

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 104857600; //100MB
});

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.SignIn.RequireConfirmedAccount = false;
    options.User.RequireUniqueEmail = true;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireNonAlphanumeric = false;
})
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigin", policy =>
    {
        policy.WithOrigins("https://localhost:11454")
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters()
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes("X7fL92bWk6TK7hkXZmK6u4JVLtLRcpXIkx4yqXIESGiUKxxTjghtCWyoglJ1U0G3"))
        };

        options.Events = new JwtBearerEvents()
        {
            OnAuthenticationFailed = response =>
            {
                Console.WriteLine($"User Authentication failed token is invalid : {response.Exception.Message}");

                return Task.CompletedTask;
            },

            OnChallenge = response =>
            {
                Console.WriteLine("User does not have a token for authentication!");

                return Task.CompletedTask; //ADD additinal logic in the future to redirect the user if he has no authentication
            },

            OnTokenValidated = context =>
            {
                var userId = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                Console.WriteLine($"Token validated matches with the user's id = {userId ?? "Id was null. Could not find id for user"}");

                return Task.CompletedTask;
            }
        };
    });

var app = builder.Build();

var directoriesConfiguration = app.Services.GetRequiredService<WebRootConfiguration>();
directoriesConfiguration.ConfigureDirectories();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("AllowSpecificOrigin");

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();

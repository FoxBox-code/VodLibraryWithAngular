using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using VodLibraryWithAngular.Server;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Interfaces;
using VodLibraryWithAngular.Server.Services;


var builder = WebApplication.CreateBuilder(args);
Xabe.FFmpeg.FFmpeg.SetExecutablesPath(@"C:\stuff\ffmpeg-2025-01-22-git-e20ee9f9ae-full_build\bin");


// Add services to the container.
string connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("The default connection was not found!");
builder.Services.AddSingleton<WebRootConfiguration>();
builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddLogging();
builder.Services.AddHttpContextAccessor();

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 209715200; //200MB
});

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 209715200; //200MB
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

builder.Services.AddScoped<DataMigrationService>(); //This places our migration service in the DI container for a blueprint on how to use it
builder.Services.AddScoped<IFileNameSanitizer, FileNameSanitizer>();
builder.Services.AddScoped<VideoFileRenditionsService>();
builder.Services.AddScoped<IDTOTransformer, DTOTransformer>();

var app = builder.Build();

var directoriesConfiguration = app.Services.GetRequiredService<WebRootConfiguration>();
directoriesConfiguration.ConfigureDirectories();


//_ = Task.Run(async () =>
//{
//    IServiceScopeFactory scopeFactory = app.Services.GetRequiredService<IServiceScopeFactory>();
//    IServiceScope scope = scopeFactory.CreateScope();

//    var dataMigrationService = scope.ServiceProvider.GetRequiredService<DataMigrationService>();
//    await dataMigrationService.UpdateVideoReplyCountVariable();
//});


//using (IServiceScope scope = app.Services.CreateScope())
//{
//    var videoFileRenditionsService = scope.ServiceProvider.GetRequiredService<VideoFileRenditionsService>();
//    await Task.Run(() => videoFileRenditionsService.RenditionExistingVideos()); 

//}
//This calls one time our service to populate comment/reply with userIds since we forgot to do it in the beginning of the project, we comment it out because we don t need to run it again but i want it to remain so i can see it

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

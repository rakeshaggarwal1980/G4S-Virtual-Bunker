using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SpaServices.AngularCli;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System;
using TeamCollaborationApp.Abstractions;
using TeamCollaborationApp.Hubs;
using TeamCollaborationApp.Options;
using TeamCollaborationApp.Services;

namespace TeamCollaborationApp
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_1);

            // In production, the Angular files will be served from this directory
            services.AddSpaStaticFiles(configuration =>
            {
                configuration.RootPath = "ClientApp/dist";
            });

            /*******/
            services.Configure<TwilioSettings>(
                settings =>
                {
                    settings.AccountSid = "ACdf18fa6baaa5ce6554b45469beff95ff"; //Environment.GetEnvironmentVariable("TWILIO_ACCOUNT_SID");
                    settings.ApiSecret = "mPCXgpFDoY4rN46xHwH35ukJsyqS0pv6"; //Environment.GetEnvironmentVariable("TWILIO_API_SECRET");
                    settings.ApiKey = "SK24c672067c60c99757607f5a14ece7b0"; //Environment.GetEnvironmentVariable("TWILIO_API_KEY");
                })
            .AddTransient<IVideoService, VideoService>()
            .AddSpaStaticFiles(config => config.RootPath = "ClientApp/dist");

            services.AddSignalR();
            /*******/

        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Error");
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseStaticFiles();
            app.UseSpaStaticFiles();

            /*******/
            app.UseSignalR(routes =>
            {
                routes.MapHub<NotificationHub>("/notificationHub");
            });
            /*******/

            app.UseMvc(routes =>
            {
                routes.MapRoute(
                    name: "default",
                    template: "{controller}/{action=Index}/{id?}");
            });

            app.UseSpa(spa =>
            {
                // To learn more about options for serving an Angular SPA from ASP.NET Core,
                // see https://go.microsoft.com/fwlink/?linkid=864501

                spa.Options.SourcePath = "ClientApp";

                if (env.IsDevelopment())
                {
                    spa.UseAngularCliServer(npmScript: "start");
                }
            });
        }
    }
}

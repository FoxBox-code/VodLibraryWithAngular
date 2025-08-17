

namespace VodLibraryWithAngular.Server
{
    public class VideoRenditionEncoder
    {
        public static async Task<List<string>> EncodeMp4VariantsAsync(string inputPath, string outputDir)
        {
            Directory.CreateDirectory(outputDir);

            var (width, height) = await FfprobeRunner.ProbeRunAsync(inputPath);
            List<string> renditionPaths = new List<string>();

            if (height >= 1080)
            {
                var out1080 = Path.Combine(outputDir, "output_1080p.mp4");


                await EncodeIfMissing(
               $"-y -i {Q(inputPath)} -vf \"scale=-2:1080\" " +
               "-c:v libx264 -preset veryfast -profile:v high -level 4.1 -pix_fmt yuv420p " +
               "-b:v 5000k -maxrate 5500k -bufsize 10000k " +
               "-c:a aac -b:a 128k -movflags +faststart " +
               Q(out1080),
               out1080);

                renditionPaths.Add(out1080);

            }
            if (height >= 720)
            {
                var out720 = Path.Combine(outputDir, "output_720p.mp4");


                await EncodeIfMissing(
                $"-y -i {Q(inputPath)} -vf \"scale=-2:720\" " +
                "-c:v libx264 -preset veryfast -profile:v high -pix_fmt yuv420p " +
                "-b:v 3000k -maxrate 3300k -bufsize 6000k " +
                "-c:a aac -b:a 128k -movflags +faststart " +
                Q(out720),
                out720);

                renditionPaths.Add(out720);
            }
            if (height >= 480)
            {
                var out480 = Path.Combine(outputDir, "output_480p.mp4");

                await EncodeIfMissing(
                $"-y -i {Q(inputPath)} -vf \"scale=-2:480\" " +
                "-c:v libx264 -preset veryfast -profile:v main -pix_fmt yuv420p " +
                "-b:v 1500k -maxrate 1600k -bufsize 3000k " +
                "-c:a aac -b:a 128k -movflags +faststart " +
                Q(out480),
                out480);

                renditionPaths.Add(out480);
            }

            var out360 = Path.Combine(outputDir, "output_360p.mp4");//were making the 360 absolute minimal even if video is 144p we format it to 360p it wont change the video by upscaling it but its still a video
            await EncodeIfMissing(
            $"-y -i {Q(inputPath)} -vf \"scale=-2:360\" " +
            "-c:v libx264 -preset veryfast -profile:v baseline -pix_fmt yuv420p " +
            "-b:v 800k -maxrate 900k -bufsize 1600k " +
            "-c:a aac -b:a 96k -movflags +faststart " +
            Q(out360),
            out360);

            renditionPaths.Add(out360);


            return renditionPaths;


            // Skip if already exists (idempotent)
            async Task EncodeIfMissing(string args, string outPath)
            {
                if (File.Exists(outPath)) return;
                var ec = await FfmpegRunner.RunMpegAsync(args);
                if (ec != 0) throw new Exception($"FFmpeg failed for {outPath} (exit code {ec}).");
            }

            string Q(string p) => $"\"{p}\""; // quote for spaces in paths





        }
    }

}



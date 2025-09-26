using VodLibraryWithAngular.Server.Data.Models;
using VodLibraryWithAngular.Server.Models;

namespace VodLibraryWithAngular.Server.Interfaces
{
    public interface IDTOTransformer
    {
        public VideoWindowDTO CreateVideoWindowDTOFromVideoRecord(VideoRecord video);


    }
}

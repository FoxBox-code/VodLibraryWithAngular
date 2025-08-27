export  class DataCosntans
{

  public static readonly defaultIconImage = 'https://localhost:7156/ProfilePics/ProfileIcons/icon2ccb3b71-b300-431b-bbd1-1cef1b2a8da60_Nn3K0jqCPuxdyK3B.jpg';
  public static readonly giveMeImage = "https://localhost:7156/thumbnail/cd56af14-265d-4544-8e18-41a2e63457a0FUUqp7RZyCU-HD.jpg";
  public static readonly TitleMaxLength = 50;
  public static readonly TitleMinLength = 3;

  public static readonly DescriptionMaxLength = 5000;

  public static readonly supportedGenresStringToInt : {[genre : string] : number} =
  {
    'music' : 1,
    'sports' : 2,
    'gaming' : 3,
    'entertainment' : 4,
    'education' : 5
  }
  public static readonly supportedGenresIntToString : {[genre : number] : string} =
  {
     1 : 'Music' ,
     2 : 'Sports',
     3 : 'Gaming',
     4 : 'Entertainment',
     5 : 'Education'
  }

  public static readonly svgIconsPath = "https://localhost:7156/Youtube%20ScreenShots"
  public static readonly historyIcon = `${this.svgIconsPath}/historyIcon.svg`;
  public static readonly personIcon = `${this.svgIconsPath}/personIcon.svg`;
  public static readonly playTabIcon = `${this.svgIconsPath}/playtabIcon.svg`;
  public static readonly homeIcon = `${this.svgIconsPath}/homeIcon.svg`;
  public static readonly subscriptionsIcon = `${this.svgIconsPath}/subscriptionsIcon.svg`;
  public static readonly menuIcon = `${this.svgIconsPath}/menuIcon.svg`;

  public static readonly musicIcon = `${this.svgIconsPath}/musicIcon.svg`;
  public static readonly sportsIcon = `${this.svgIconsPath}/sportsIcon.svg`;
  public static readonly gamingIcon = `${this.svgIconsPath}/steamIcon.svg`;
  public static readonly entertainmentIcon = `${this.svgIconsPath}/entertainment-svgrepo-com.svg`;
  public static readonly educationIcon = `${this.svgIconsPath}/education-learning-6-svgrepo-com.svg`;
  public static readonly likeIcon = `${this.svgIconsPath}/likeIcon.svg`;
  public static readonly playListIcon = `${this.svgIconsPath}/playListIcon.svg`


  public static readonly playButtonIcon = `${this.svgIconsPath}/playIcon.svg`;
  public static readonly pauseButtonIcon = `${this.svgIconsPath}/puaseIcon.svg`;
  public static readonly gearIcon = `${this.svgIconsPath}/gearIcon.svg`;
  public static readonly higherVolumeIcon = `${this.svgIconsPath}/higherVolumeIcon.svg`;
  public static readonly noVolumeIcon = `${this.svgIconsPath}/noVolumeIcon.svg`;
  public static readonly smallVolumeIcon = `${this.svgIconsPath}/smallVolumeIcon.svg`;
  public static readonly fullScreenIcon = `${this.svgIconsPath}/fullScreenIcon.svg`;
  public static readonly smallScreenIcon = `${this.svgIconsPath}/smallScreenIcon.svg`;
  public static readonly fastForwardIcon = `${this.svgIconsPath}/fastForwardIcon.svg`;
  public static readonly rewindTimeForwardIcon = `${this.svgIconsPath}/rewindTimeForwardIcon.svg`;
  public static readonly rewindTimeBackWardsIcon = `${this.svgIconsPath}/rewindTimeBackWards.svg`;

  public static readonly videoSpriteCapacity = 50;
  public static readonly videoSpriteCol = 10;
  public static readonly videoSpriteRow = 5;
  public static readonly frameWidth = 160;
  public static readonly frameHeight = 90;


}

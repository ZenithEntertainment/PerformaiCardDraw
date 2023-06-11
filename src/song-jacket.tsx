import { Song } from './models/SongData';
import { Music } from 'react-feather';

interface Props {
  song: Song;
  className?: string;
  height: number;
}

export function SongJacket(props: Props) {
  if (props.song.jacket) {
    return (
      <img
        src={`jackets/${props.song.jacket}`}
        className={props.className}
        style={{ height: `${props.height}px` }}
      />
    );
  }
  return (
    <div className={props.className}>
      <Music size={props.height} />
    </div>
  );
}

/* eslint-disable no-await-in-loop */
import fs from 'node:fs';
import download from 'download';
import pqueue from 'p-queue';
import { Song } from '../src/models/SongData';

const requestQueue = new pqueue({
  concurrency: 6, // 6 concurrent max
  interval: 1000,
  intervalCap: 10, // 10 per second max
});

export default async function run(
  dataUrl: string,
  baseUrl: string,
  songs: Song[],
  headers?: Record<string, string>
) {
  const coverImgDir = `src/assets/jackets`;

  console.info(`Fetching data from: ${dataUrl} ...`);
  const response = await fetch(dataUrl);
  const data: Array<Record<string, string>> = await response.json();
  
  const songJacketFileNames: Record<string, string> = data.reduce(
    (accum, songEntry) => {
      accum[songEntry.id] = songEntry.image;
      return accum;
    }, {}
  );
  console.info(JSON.stringify(songJacketFileNames));

  console.info('* Downloading cover image for songs ...');
  for (const [index, song] of songs.entries()) {
	const songId = song.id;
	if (songId == null) continue;
    const jacketName = songJacketFileNames[songId];
    if (song.jacket && !fs.existsSync(`${coverImgDir}/${song.jacket}`)) {
      console.info(`(${1 + index} / ${songs.length}) ${song.name}`);
      /*
      const arcadeSong = arcadeSongs[song.name];
      if (!arcadeSong || arcadeSong.artist !== song.artist) {
        console.log(`Could not find or download jacket for: ${song.name}`);
        continue;
      }
      */
      const imageUrl = `${baseUrl}${jacketName}`;
	  console.info(imageUrl);

      requestQueue
        .add(() =>
          download(imageUrl, coverImgDir, {
            filename: song.jacket,
            headers,
            rejectUnauthorized: false,
          })
        )
        .catch((e) => {
          
          console.log(`Could not download jacket for: ${song.name}`);
        });
    }
  }

  console.info('Done!');
}

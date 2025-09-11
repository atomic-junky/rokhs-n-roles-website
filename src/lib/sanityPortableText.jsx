import { Image } from "astro:assets";
import { getSanityImageURL } from '../utils/helpers.js';

export const imageType = ({ value }) => {
    return (
        <div class="content-image-container">
            <Image src={getSanityImageURL(value.asset).url()} />
            <br/>
        </div>
    )
}
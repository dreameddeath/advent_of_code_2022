
const start = new Date().getTime();
import "./history/day_1";
import "./history/day_2";
import "./history/day_3";
import "./history/day_4";
import "./history/day_5";
import "./history/day_6";
import "./history/day_7";
import "./history/day_8";
import "./history/day_9";
import "./history/day_10";
import "./history/day_11";
import "./history/day_12";
import "./history/day_13";
import "./day_14";
import { failures } from "./day_utils";

const duration = new Date().getTime() - start;

console.log(`\n[Global] All run in ${duration} ms`);
for(let domain in failures){
    const domainFailures = failures[domain as keyof typeof failures];
    if(domainFailures.count > 0){
        console.error(`[Global] ${domain} Failure(s) : ${domainFailures.count} / ${domainFailures.parts}`);
    }
}
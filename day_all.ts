
const start = new Date().getTime();
import { failures/*,disableTests*/ } from "./day_utils";
//disableTests();
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
import "./history/day_14";
import "./history/day_15";
import "./history/day_17";
import "./history/day_18";

const duration = new Date().getTime() - start;

console.log(`\n[Global] All run in ${duration} ms`);
let totalFailures = 0;
for(let domain in failures){
    const domainFailures = failures[domain as keyof typeof failures];
    if(domainFailures.count > 0){
        totalFailures+=domainFailures.count;
        console.error(`[Global] ${domain} Failure(s) : ${domainFailures.count} / ${domainFailures.parts}`);
    }
}
if(totalFailures===0){
    console.log(`\n[Global] No errors`);   
}
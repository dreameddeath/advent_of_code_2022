use std::{
    collections::{BinaryHeap, HashMap},
    hash::Hash,
};

pub trait Cost<C> {
    fn cost(&self) -> C;
}

pub trait Key<K> {
    fn key(&self) -> K;
}

#[derive(Debug)]
struct Wrapper<C: Ord + PartialOrd, K, T> {
    item: T,
    key: K,
    cost: C,
}

impl<C: Ord + PartialOrd, K, T> PartialEq for Wrapper<C, K, T> {
    fn eq(&self, other: &Self) -> bool {
        self.cost == other.cost
    }
}
impl<C: Ord + PartialOrd, K, T> Eq for Wrapper<C, K, T> {}

impl<C: Ord + PartialOrd, K, T> Ord for Wrapper<C, K, T> {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        other.cost.cmp(&self.cost)
    }
}

impl<C: Ord + PartialOrd, K, T> PartialOrd for Wrapper<C, K, T> {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        other.cost.partial_cmp(&self.cost)
    }
}

pub struct PriorityQueue<C: Ord + Copy + Clone, K: Hash + Copy + Clone, T: Cost<C> + Key<K>> {
    best_inserted: HashMap<K, C>,
    queue: BinaryHeap<Wrapper<C,K, T>>,
}

impl<C: Ord + Copy + Clone, K: Hash + Eq + Copy + Clone, T: Cost<C> + Key<K>>
    PriorityQueue<C, K, T>
{
    pub fn new() -> PriorityQueue<C, K, T> {
        return PriorityQueue {
            queue: BinaryHeap::new(),
            best_inserted: HashMap::new(),
        };
    }

    pub fn push(&mut self, v: T) {
        let cost = v.cost();
        let key: K = v.key();
        if self
            .best_inserted
            .get(&key)
            .filter(|c| **c <= cost)
            .is_some()
        {
            return;
        }
        let wrapper = Wrapper { item: v, key, cost };

        self.best_inserted.insert(key, cost);
        self.queue.push(wrapper);
    }

    pub fn pop(&mut self) -> Option<T> {
        while let Some(w) = self.queue.pop(){
            if self
                .best_inserted
                .get(&w.key)
                .filter(|c| **c < w.cost)
                .is_none()
            {
                return Some(w.item);
            }
        }
        None
    }
}
